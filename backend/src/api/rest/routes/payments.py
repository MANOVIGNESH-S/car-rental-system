from uuid import UUID
from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.api.rest.dependencies import get_db_connection, get_current_user, require_role
from src.constants.enums import UserRole
from src.schemas.payment import PaymentLedgerResponse, PaymentRecordResponse, ManualRefundRequest
from src.core.services.payment_service import PaymentService

# Separate routers for customer and administrative access
router = APIRouter()
admin_router = APIRouter()

@router.get(
    "/bookings/{booking_id}/payments",
    response_model=PaymentLedgerResponse,
    status_code=status.HTTP_200_OK
)
async def get_booking_ledger(
    booking_id: UUID,
    current_user: Annotated[dict, Depends(require_role(UserRole.customer))],
    conn: Annotated[any, Depends(get_db_connection)]
) -> PaymentLedgerResponse:
    """
    Retrieves the full payment history for a specific booking.
    Access restricted to the customer who owns the booking.
    """
    return await PaymentService.get_booking_payments(
        conn=conn,
        booking_id=booking_id,
        user_id=current_user["user_id"]
    )

@admin_router.post(
    "/admin/payments/refund",
    response_model=PaymentRecordResponse,
    status_code=status.HTTP_201_CREATED
)
async def process_manual_refund(
    data: ManualRefundRequest,
    current_user: Annotated[dict, Depends(require_role(UserRole.manager, UserRole.admin))],
    conn: Annotated[any, Depends(get_db_connection)]
) -> PaymentRecordResponse:
    """
    Manually processes a refund for a booking.
    Access restricted to Admin and Manager roles.
    """
    return await PaymentService.process_manual_refund(
        conn=conn,
        booking_id=data.booking_id,
        amount=data.amount,
        payment_method=data.payment_method.value,
        reason=data.reason,
        initiated_by=current_user["user_id"]
    )