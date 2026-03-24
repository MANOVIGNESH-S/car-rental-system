import secrets
from datetime import datetime, timezone
from decimal import Decimal

import asyncpg

from src.observability.logging.logger import get_logger
from src.schemas.webhook import KYCResultWebhookRequest, DamageResultWebhookRequest
from src.constants.enums import (
    DamageClassification,
    JobType,
    ReferenceType,
    TransactionType,
    PaymentStatus,
)
from src.data.repositories.job_repository import JobRepository
from src.data.repositories.user_repository import UserRepository
from src.data.repositories.damage_log_repository import DamageLogRepository
from src.data.repositories.booking_repository import BookingRepository
from src.data.repositories.payment_repository import PaymentRepository

logger = get_logger(__name__)


class WebhookService:

    @staticmethod
    async def process_kyc_result(
        conn: asyncpg.Connection,
        data: KYCResultWebhookRequest,
    ) -> None:
        if data.status.value == "failed":
            error_msg = data.error or "Worker failed"
            await JobRepository.fail_job(conn, data.job_id, error_msg)
            await UserRepository.update_kyc_from_worker(
                conn, data.user_id, "failed", None, None, None
            )
            logger.error(f"KYC job {data.job_id} failed for user {data.user_id}: {error_msg}")
            return

        if data.status.value == "completed":
            await JobRepository.complete_job(conn, data.job_id)

            kyc_verified_at = None
            if data.kyc_decision.value == "verified":
                kyc_verified_at = datetime.now(timezone.utc).replace(tzinfo=None)

            await UserRepository.update_kyc_from_worker(
                conn,
                data.user_id,
                data.kyc_decision.value,
                data.extracted_address,
                data.dl_expiry_date,
                kyc_verified_at,
            )

            await JobRepository.create(
                conn,
                job_type=JobType.email_notification.value,
                reference_id=data.user_id,
                reference_type=ReferenceType.user.value,
            )

            logger.info(f"KYC job {data.job_id} completed for user {data.user_id}: {data.kyc_decision.value}")

    @staticmethod
    async def process_damage_result(
        conn: asyncpg.Connection,
        data: DamageResultWebhookRequest,
    ) -> None:
        if data.status.value == "failed":
            error_msg = data.error or "Worker failed"
            await JobRepository.fail_job(conn, data.job_id, error_msg)
            logger.error(f"Damage job {data.job_id} failed for booking {data.booking_id}: {error_msg}")
            return

        if data.status.value == "completed":
            await JobRepository.complete_job(conn, data.job_id)

            await DamageLogRepository.update_llm_classification(
                conn, data.booking_id, data.classification.value
            )

            if data.classification == DamageClassification.green:
                booking = await BookingRepository.get_by_id(conn, data.booking_id)
                security_deposit = Decimal(str(booking["security_deposit"]))
                
                timestamp = int(datetime.now(timezone.utc).timestamp())
                token = secrets.token_hex(3).upper()
                mock_id = f"AUTO_REF_{timestamp}_{token}"

                await PaymentRepository.create(
                    conn,
                    booking_id=data.booking_id,
                    initiated_by=None,
                    amount=security_deposit,
                    transaction_type=TransactionType.refund.value,
                    payment_method="cash",
                    status=PaymentStatus.completed.value,
                    mock_transaction_id=mock_id,
                )
                logger.info(f"Auto refund created for Green booking {data.booking_id}")

            elif data.classification == DamageClassification.amber:
                logger.info(f"Amber classification for booking {data.booking_id} — manual review required")

            elif data.classification == DamageClassification.red:
                logger.warning(f"Red classification for booking {data.booking_id} — deposit held")

            await JobRepository.create(
                conn,
                job_type=JobType.email_notification.value,
                reference_id=data.booking_id,
                reference_type=ReferenceType.booking.value,
            )