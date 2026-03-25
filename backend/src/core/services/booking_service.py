from __future__ import annotations

import asyncpg
import secrets
from datetime import datetime, time, timezone, timedelta
from uuid import UUID
from decimal import Decimal
from typing import Any

from src.schemas.booking import (
    CreateBookingRequest,
    CreateBookingResponse,
    BookingListItem,
    BookingDetailResponse,
    BookingPaymentInfo,
    AdminBookingListItem,
    CheckinResponse,
    CheckoutResponse,
)
from src.data.repositories.booking_repository import BookingRepository
from src.data.repositories.payment_repository import PaymentRepository
from src.data.repositories.damage_log_repository import DamageLogRepository
from src.data.repositories.job_repository import JobRepository
from src.constants.enums import (
    BookingStatus,
    PaymentStatus,
    TransactionType,
    JobType,
    ReferenceType,
)
from src.utils.pricing import calculate_rental_fee
from src.core.exceptions.base import (
    ValidationError,
    NotFoundError,
    ConflictError,
    ForbiddenError,
    KYCRequiredError,
    SuspendedAccountError,
)
from src.observability.logging.logger import get_logger

logger = get_logger(__name__)


class BookingService:

    @staticmethod
    def _strip_tz(dt: datetime) -> datetime:
        return dt.replace(tzinfo=None) if dt.tzinfo else dt

    @staticmethod
    async def create_booking(
        conn: asyncpg.Connection,
        user_id: UUID,
        data: CreateBookingRequest,
    ) -> CreateBookingResponse:
        user = await conn.fetchrow(
            "SELECT kyc_status, is_suspended FROM users WHERE user_id = $1",
            user_id,
        )
        if not user:
            raise NotFoundError("User")
        if user["kyc_status"] != "verified":
            raise KYCRequiredError()
        if user["is_suspended"]:
            raise SuspendedAccountError()

        now = datetime.now(timezone.utc)

        if data.start_time < now:
            raise ValidationError("Start time cannot be in the past.")
        if data.start_time > now + timedelta(days=60):
            raise ValidationError("Booking cannot be made more than 60 days in advance.")

        duration = data.end_time - data.start_time
        if duration.total_seconds() <= 0:
            raise ValidationError("End time must be after start time.")
        if duration > timedelta(days=14):
            raise ValidationError("Maximum booking duration is 14 days.")

        for dt in [data.start_time, data.end_time]:
            local_time = dt.astimezone(timezone.utc).time()
            if not (time(9, 0) <= local_time <= time(18, 0)):
                raise ValidationError("Pick-up and drop-off must be between 09:00 and 18:00.")

        naive_start = BookingService._strip_tz(data.start_time)
        naive_end = BookingService._strip_tz(data.end_time)

        try:
            async with conn.transaction():
                vehicle = await BookingRepository.lock_vehicle_for_booking(conn, data.vehicle_id)
                if not vehicle:
                    raise NotFoundError("Vehicle")

                if vehicle["vehicle_status"] != "available":
                    raise ConflictError("Vehicle is currently not available for booking.")

                has_overlap = await BookingRepository.check_booking_overlap(
                    conn, data.vehicle_id, naive_start, naive_end
                )
                if has_overlap:
                    raise ConflictError("Vehicle is already booked for this time slot.")

                rental_fee = calculate_rental_fee(
                    data.start_time,
                    data.end_time,
                    Decimal(str(vehicle["hourly_rate"])),
                    Decimal(str(vehicle["daily_rate"])),
                )
                security_deposit = Decimal(str(vehicle["security_deposit"]))
                total_price = rental_fee + security_deposit

                booking_dict = await BookingRepository.create(
                    conn,
                    user_id,
                    data.vehicle_id,
                    naive_start,
                    naive_end,
                    rental_fee,
                    security_deposit,
                    total_price,
                )
                booking_id = booking_dict["booking_id"]

                txn_id = f"TXN_{int(datetime.now(timezone.utc).timestamp())}_{secrets.token_hex(3).upper()}"

                rental_payment = await PaymentRepository.create(
                    conn,
                    booking_id,
                    user_id,
                    rental_fee,
                    TransactionType.rental_fee.value,
                    data.payment_method.value,
                    PaymentStatus.completed.value,
                    txn_id,
                )

                await PaymentRepository.create(
                    conn,
                    booking_id,
                    user_id,
                    security_deposit,
                    TransactionType.security_deposit.value,
                    data.payment_method.value,
                    PaymentStatus.completed.value,
                    txn_id,
                )

                await DamageLogRepository.create_empty(conn, booking_id)

                await JobRepository.create(
                    conn,
                    JobType.email_notification.value,
                    booking_id,
                    ReferenceType.booking.value,
                )

                from src.workers.notification_worker import send_email_notification
                send_email_notification.delay(
                    reference_id=str(booking_id),
                    reference_type=ReferenceType.booking.value,
                )

                logger.info(f"Booking created: {booking_id} for user {user_id}")

                return CreateBookingResponse(
                    booking_id=booking_id,
                    status=BookingStatus.reserved,
                    start_time=booking_dict["start_time"],
                    end_time=booking_dict["end_time"],
                    rental_fee=booking_dict["rental_fee"],
                    security_deposit=booking_dict["security_deposit"],
                    total_price=booking_dict["total_price"],
                    payment=BookingPaymentInfo(**rental_payment),
                )

        except asyncpg.exceptions.LockNotAvailableError:
            raise ConflictError("Vehicle is being booked by another user. Please try again.")

    @staticmethod
    async def get_user_bookings(conn: asyncpg.Connection, user_id: UUID, status: str | None, page: int, limit: int) -> list[BookingListItem]:
        rows = await BookingRepository.get_by_user(conn, user_id, status, page, limit)

        result = []
        for row in rows:
            thumbnail_urls = row.get("thumbnail_urls") or []
            item = BookingListItem(
                booking_id=row["booking_id"],
                vehicle_id=row["vehicle_id"],
                vehicle_brand=row.get("vehicle_brand"),
                vehicle_model=row.get("vehicle_model"),
                vehicle_thumbnail=thumbnail_urls[0] if thumbnail_urls else None,
                start_time=row["start_time"],
                end_time=row["end_time"],
                total_price=row["total_price"],
                status=row["status"],
                created_at=row["created_at"],
            )
            result.append(item)
        return result

    @staticmethod
    async def get_booking_detail(conn: asyncpg.Connection, booking_id: UUID, user_id: UUID) -> BookingDetailResponse:
        booking = await BookingRepository.get_by_id(conn, booking_id)
        if not booking:
            raise NotFoundError("Booking")

        if str(booking["user_id"]) != str(user_id):
            raise ForbiddenError("Access denied")

        payments = await PaymentRepository.get_by_booking_id(conn, booking_id)
        booking["payments"] = [BookingPaymentInfo(**p) for p in payments]

        return BookingDetailResponse(**booking)

    @staticmethod
    async def cancel_booking(
        conn: asyncpg.Connection,
        booking_id: UUID,
        user_id: UUID,
    ) -> dict[str, Any]:
        booking = await BookingRepository.get_by_id(conn, booking_id)
        if not booking:
            raise NotFoundError("Booking")
        if booking["user_id"] != user_id:
            raise ForbiddenError()
        if booking["status"] != BookingStatus.reserved.value:
            raise ConflictError("Only reserved bookings can be cancelled.")

        cancelled = await BookingRepository.cancel(conn, booking_id)

        await JobRepository.create(
            conn,
            JobType.email_notification.value,
            booking_id,
            ReferenceType.booking.value,
        )

        from src.workers.notification_worker import send_email_notification
        send_email_notification.delay(
            reference_id=str(booking_id),
            reference_type=ReferenceType.booking.value,
        )

        logger.info(f"Booking cancelled: {booking_id}")
        return dict(cancelled)

    @staticmethod
    async def checkin_booking(
        conn: asyncpg.Connection,
        booking_id: UUID,
        fuel_level: int,
    ) -> CheckinResponse:
        booking = await BookingRepository.get_by_id(conn, booking_id)
        if not booking:
            raise NotFoundError("Booking")
        if booking["status"] != BookingStatus.reserved.value:
            raise ConflictError("Booking is not in reserved status.")

        damage_log = await DamageLogRepository.get_by_booking_id(conn, booking_id)
        if not damage_log or not damage_log.get("pre_rental_image_urls"):
            raise ValidationError("Pre-rental images must be uploaded before check-in.")

        await BookingRepository.update_checkin(conn, booking_id)
        await DamageLogRepository.update_fuel_pickup(conn, booking_id, fuel_level)

        logger.info(f"Booking checked in: {booking_id}")

        return CheckinResponse(
            booking_id=booking_id,
            status=BookingStatus.active,
            is_physically_verified=True,
            fuel_level_at_pickup=fuel_level,
        )

    @staticmethod
    async def checkout_booking(
        conn: asyncpg.Connection,
        booking_id: UUID,
        fuel_level: int,
    ) -> CheckoutResponse:
        booking = await BookingRepository.get_by_id(conn, booking_id)
        if not booking:
            raise NotFoundError("Booking")
        if booking["status"] != BookingStatus.active.value:
            raise ConflictError("Booking is not in active status.")

        damage_log = await DamageLogRepository.get_by_booking_id(conn, booking_id)
        if not damage_log or not damage_log.get("post_rental_image_urls"):
            raise ValidationError("Post-rental images must be uploaded before checkout.")

        updated = await BookingRepository.update_checkout(conn, booking_id)
        await DamageLogRepository.update_fuel_return(conn, booking_id, fuel_level)

        job = await JobRepository.create(
            conn,
            JobType.damage_assessment.value,
            booking_id,
            ReferenceType.booking.value,
        )

        from src.workers.damage_worker import run_damage_assessment
        run_damage_assessment.delay(
            job_id=str(job["job_id"]),
            booking_id=str(booking_id),
        )

        logger.info(f"Checkout complete, damage job enqueued to Celery: {job['job_id']} for booking {booking_id}")

        return CheckoutResponse(
            booking_id=booking_id,
            status=BookingStatus.completed,
            actual_end_time=updated["actual_end_time"],
            damage_job_id=job["job_id"],
        )

    @staticmethod
    async def get_admin_bookings(
        conn: asyncpg.Connection,
        filters: dict[str, Any],
    ) -> list[AdminBookingListItem]:
        rows = await BookingRepository.get_all_admin(conn, **filters)
        return [
            AdminBookingListItem(
                booking_id=row["booking_id"],
                user_id=row["user_id"],
                user_name=row.get("user_name"),
                user_phone=row.get("user_phone"),
                vehicle_id=row["vehicle_id"],
                vehicle_brand=row.get("vehicle_brand"),
                vehicle_model=row.get("vehicle_model"),
                branch_tag=row.get("branch_tag"),
                start_time=row["start_time"],
                end_time=row["end_time"],
                total_price=row["total_price"],
                status=row["status"],
                is_physically_verified=row["is_physically_verified"],
            )
            for row in rows
        ]