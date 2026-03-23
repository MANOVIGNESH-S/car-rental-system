import secrets
from uuid import UUID
from decimal import Decimal
from datetime import datetime, timezone
from typing import Any

from src.data.repositories.booking_repository import BookingRepository
from src.data.repositories.payment_repository import PaymentRepository
from src.core.exceptions.base import NotFoundError, ForbiddenError, ConflictError
from src.constants.enums import TransactionType, PaymentStatus, BookingStatus
from src.schemas.payment import PaymentLedgerResponse, PaymentRecordResponse
from src.observability.logging.logger import get_logger

logger = get_logger(__name__)

class PaymentService:
    @staticmethod
    async def get_booking_payments(
        conn: Any,
        booking_id: UUID,
        user_id: UUID,
    ) -> PaymentLedgerResponse:
        # 1. Get booking
        booking = await BookingRepository.get_by_id(conn, booking_id)
        
        # 2. Raise NotFoundError if not found
        if not booking:
            raise NotFoundError("Booking")

        # 3. Verify booking ownership (CRITICAL: Using dict access for current_user/record)
        if booking["user_id"] != user_id:
            raise ForbiddenError("You do not have permission to view this ledger.")

        # 4. Get payment records
        payments_data = await PaymentRepository.get_by_booking_id(conn, booking_id)

        # 5. Get aggregated totals
        totals = await PaymentRepository.get_total_by_booking(conn, booking_id)

        # 6. Build PaymentRecordResponse list
        payment_list = [PaymentRecordResponse(**p) for p in payments_data]

        # 7. Return aggregated ledger
        return PaymentLedgerResponse(
            booking_id=booking_id,
            payments=payment_list,
            total_charged=totals["total_charged"],
            total_refunded=totals["total_refunded"]
        )

    @staticmethod
    async def process_manual_refund(
        conn: Any,
        booking_id: UUID,
        amount: Decimal,
        payment_method: str,
        reason: str,
        initiated_by: UUID,
    ) -> PaymentRecordResponse:
        # 1. Get booking
        booking = await BookingRepository.get_by_id(conn, booking_id)

        # 2. Raise NotFoundError if not found
        if not booking:
            raise NotFoundError("Booking")

        # 3. Check booking status (must be completed or active)
        valid_statuses = [BookingStatus.completed.value, BookingStatus.active.value]
        if booking["status"] not in valid_statuses:
            raise ConflictError("Refunds only allowed for active or completed bookings")

        # 4. Generate mock transaction ID
        timestamp_slug = int(datetime.now(timezone.utc).timestamp())
        random_slug = secrets.token_hex(3).upper()
        mock_transaction_id = f"REF_{timestamp_slug}_{random_slug}"

        # 5. Create payment record via repository
        payment = await PaymentRepository.create(
            conn=conn,
            booking_id=booking_id,
            initiated_by=initiated_by,
            amount=amount,
            transaction_type=TransactionType.refund.value,
            payment_method=payment_method,
            status=PaymentStatus.completed.value,
            mock_transaction_id=mock_transaction_id
        )

        # 6. Log the administrative action
        logger.info(
            f"Manual refund processed: {mock_transaction_id} for booking "
            f"{booking_id} by {initiated_by}. Reason: {reason}"
        )

        # 7. Return created record
        return PaymentRecordResponse(**payment)