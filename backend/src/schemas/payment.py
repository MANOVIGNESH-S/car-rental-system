from uuid import UUID
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from src.constants.enums import TransactionType, PaymentMethod, PaymentStatus

class PaymentRecordResponse(BaseModel):
    """Represents a single payment entry in the ledger."""
    payment_id: UUID
    booking_id: UUID
    initiated_by: UUID | None
    amount: Decimal
    transaction_type: TransactionType
    payment_method: PaymentMethod
    status: PaymentStatus
    mock_transaction_id: str | None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class PaymentLedgerResponse(BaseModel):
    """Aggregated view of all transactions related to a specific booking."""
    booking_id: UUID
    payments: list[PaymentRecordResponse]
    total_charged: Decimal
    total_refunded: Decimal

    model_config = ConfigDict(from_attributes=True)

class ManualRefundRequest(BaseModel):
    """Schema for administrative refund processing."""
    booking_id: UUID
    amount: Decimal = Field(gt=0, description="Refund amount must be greater than zero")
    payment_method: PaymentMethod
    reason: str = Field(min_length=5, description="Brief explanation for the refund")

    model_config = ConfigDict(from_attributes=True)