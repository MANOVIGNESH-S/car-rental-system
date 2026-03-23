from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4
from decimal import Decimal

from sqlalchemy import ForeignKey, String, Numeric, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column

from src.data.models.postgres.base import Base
from src.constants.enums import PaymentStatus, TransactionType, PaymentMethod

class Payment(Base):
    __tablename__ = "payments"

    payment_id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    booking_id: Mapped[UUID] = mapped_column(ForeignKey("bookings.booking_id"), nullable=False)
    initiated_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    
    amount: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    transaction_type: Mapped[TransactionType] = mapped_column(String, nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(String, nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        String, 
        server_default=PaymentStatus.pending.value,
        nullable=False
    )
    
    mock_transaction_id: Mapped[str | None] = mapped_column(String, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=text("NOW()"))