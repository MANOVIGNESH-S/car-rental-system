import secrets
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import UploadFile

from src.constants.enums import (
    DamageClassification,
    PaymentStatus,
    TransactionType,
    JobType,
)
from src.core.exceptions.base import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from src.data.clients.s3_client import s3_client
from src.data.repositories.booking_repository import BookingRepository
from src.data.repositories.damage_log_repository import DamageLogRepository
from src.data.repositories.job_repository import JobRepository
from src.data.repositories.payment_repository import PaymentRepository
from src.observability.logging.logger import get_logger
from src.schemas.damage import (
    DamageImageUploadResponse,
    DamageLogResponse,
    DamageResolveResponse,
)

logger = get_logger(__name__)


class DamageService:
    @staticmethod
    async def upload_pre_images(
        conn: Any,
        booking_id: UUID,
        files: list[UploadFile],
    ) -> DamageImageUploadResponse:
        booking = await BookingRepository.get_by_id(conn, booking_id)
        if not booking:
            raise NotFoundError("Booking")

        if booking["status"] != "reserved":
            raise ConflictError("Pre-rental images can only be uploaded for reserved bookings")

        if len(files) != 5:
            raise ValidationError(
                "Exactly 5 images required: front, rear, left, right, dashboard"
            )

        slot_names = [
            "front_exterior", "rear_exterior", "left_exterior", "right_exterior",
            "dashboard"
        ]
        uploaded_urls = []

        for i, file in enumerate(files):
            if file.content_type not in ["image/jpeg", "image/png"]:
                raise ValidationError(f"File {file.filename} is invalid. Only JPG and PNG allowed")

            file_bytes = await file.read()
            key = f"damage/{booking_id}/pre/{slot_names[i]}.jpg"
            url = await s3_client.upload_file(file_bytes, key, file.content_type)
            uploaded_urls.append(url)  # plain URL stored in DB

        await DamageLogRepository.update_pre_images(conn, booking_id, uploaded_urls)

        # FIX: presign before returning — the response goes to the client
        presigned_urls = [s3_client.presign(u) for u in uploaded_urls]

        return DamageImageUploadResponse(
            booking_id=booking_id,
            image_type="pre_rental",
            uploaded_urls=presigned_urls,
            uploaded_at=datetime.now(timezone.utc),
        )

    @staticmethod
    async def upload_post_images(
        conn: Any,
        booking_id: UUID,
        user_id: UUID,
        files: list[UploadFile],
    ) -> DamageImageUploadResponse:
        booking = await BookingRepository.get_by_id(conn, booking_id)
        if not booking:
            raise NotFoundError("Booking")

        if booking["user_id"] != user_id:
            raise ForbiddenError("You do not own this booking")

        if booking["status"] != "active":
            raise ConflictError("Post-rental images can only be uploaded for active bookings")

        if len(files) != 5:
            raise ValidationError(
                "Exactly 5 images required: front, rear, left, right, dashboard"
            )

        slot_names = [
            "front_exterior", "rear_exterior", "left_exterior", "right_exterior",
            "dashboard"
        ]
        uploaded_urls = []

        for i, file in enumerate(files):
            if file.content_type not in ["image/jpeg", "image/png"]:
                raise ValidationError(f"File {file.filename} is invalid. Only JPG and PNG allowed")

            file_bytes = await file.read()
            key = f"damage/{booking_id}/post/{slot_names[i]}.jpg"
            url = await s3_client.upload_file(file_bytes, key, file.content_type)
            uploaded_urls.append(url)  # plain URL stored in DB

        await DamageLogRepository.update_post_images(conn, booking_id, uploaded_urls)

        # FIX: presign before returning — the response goes to the client
        presigned_urls = [s3_client.presign(u) for u in uploaded_urls]

        return DamageImageUploadResponse(
            booking_id=booking_id,
            image_type="post_rental",
            uploaded_urls=presigned_urls,
            uploaded_at=datetime.now(timezone.utc),
        )

    @staticmethod
    async def get_damage_log(
        conn: Any,
        booking_id: UUID,
    ) -> DamageLogResponse:
        log = await DamageLogRepository.get_by_booking_id(conn, booking_id)
        if not log:
            raise NotFoundError("Damage log")

        job = await JobRepository.get_by_reference(
            conn, booking_id, JobType.damage_assessment.value
        )

        damage_job = None
        if job:
            damage_job = {
                "status": job["status"],
                "retry_count": job["retry_count"],
                "last_error": job["last_error"],
            }

        # FIX: presign image URL lists before returning — these are shown to
        # admin reviewers in the UI and must be loadable in a browser
        pre_urls = log.get("pre_rental_image_urls") or []
        post_urls = log.get("post_rental_image_urls") or []

        return DamageLogResponse(
            log_id=log["log_id"],
            booking_id=log["booking_id"],
            pre_rental_image_urls=[s3_client.presign(u) for u in pre_urls],
            post_rental_image_urls=[s3_client.presign(u) for u in post_urls],
            fuel_level_at_pickup=log["fuel_level_at_pickup"],
            fuel_level_at_return=log["fuel_level_at_return"],
            llm_classification=log["llm_classification"],
            created_at=log["created_at"],
            damage_job=damage_job,
        )

    @staticmethod
    async def resolve_damage(
        conn: Any,
        booking_id: UUID,
        decision: str,
        damage_amount: Decimal | None,
        notes: str,
        resolved_by: UUID,
    ) -> DamageResolveResponse:
        # ✅ UNCHANGED — no image URLs in this flow
        log = await DamageLogRepository.get_by_booking_id(conn, booking_id)
        if not log:
            raise NotFoundError("Damage log")

        if log["llm_classification"] not in [
            DamageClassification.amber.value,
            DamageClassification.red.value,
            DamageClassification.needs_review.value,
        ]:
            raise ConflictError(
                "Damage resolution only available for Amber, Red, or needs_review classifications"
            )

        booking = await BookingRepository.get_by_id(conn, booking_id)
        security_deposit = Decimal(str(booking["security_deposit"]))

        payment_ids = []
        refund_val = Decimal("0.00")

        if decision == "clear":
            payment = await PaymentRepository.create(
                conn,
                booking_id=booking_id,
                initiated_by=resolved_by,
                amount=security_deposit,
                transaction_type=TransactionType.refund.value,
                payment_method="cash",
                status=PaymentStatus.completed.value,
                mock_transaction_id=f"REF_{int(datetime.now(timezone.utc).timestamp())}_{secrets.token_hex(3).upper()}",
            )
            payment_ids.append(payment["payment_id"])
            refund_val = security_deposit
            damage_amount = None

        elif decision == "charge":
            if damage_amount > security_deposit:
                raise ValidationError("Damage amount cannot exceed security deposit")

            charge_payment = await PaymentRepository.create(
                conn,
                booking_id=booking_id,
                initiated_by=resolved_by,
                amount=damage_amount,
                transaction_type=TransactionType.damage_charge.value,
                payment_method="cash",
                status=PaymentStatus.completed.value,
                mock_transaction_id=f"CHG_{int(datetime.now(timezone.utc).timestamp())}_{secrets.token_hex(3).upper()}",
            )
            payment_ids.append(charge_payment["payment_id"])

            refund_val = security_deposit - damage_amount
            if refund_val > 0:
                refund_payment = await PaymentRepository.create(
                    conn,
                    booking_id=booking_id,
                    initiated_by=resolved_by,
                    amount=refund_val,
                    transaction_type=TransactionType.refund.value,
                    payment_method="cash",
                    status=PaymentStatus.completed.value,
                    mock_transaction_id=f"REF_{int(datetime.now(timezone.utc).timestamp())}_{secrets.token_hex(3).upper()}",
                )
                payment_ids.append(refund_payment["payment_id"])

        logger.info(f"Damage resolved: {decision} for booking {booking_id} by {resolved_by}")

        return DamageResolveResponse(
            booking_id=booking_id,
            resolution=decision,
            damage_amount=damage_amount,
            refund_amount=refund_val,
            payment_records_created=payment_ids,
        )