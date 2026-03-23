from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4
from decimal import Decimal

from sqlalchemy import ForeignKey, String, Numeric, DateTime, Boolean, text
from sqlalchemy.orm import Mapped, mapped_column

from src.data.models.postgres.base import Base
from src.constants.enums import BookingStatus

class Booking(Base):
    __tablename__ = "bookings"

    booking_id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    vehicle_id: Mapped[UUID] = mapped_column(ForeignKey("vehicles.vehicle_id"), nullable=False)
    
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    actual_end_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    rental_fee: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    security_deposit: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    
    is_physically_verified: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    status: Mapped[BookingStatus] = mapped_column(
        String, 
        server_default=BookingStatus.reserved.value,
        nullable=False
    )
    
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("NOW()"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=text("NOW()"), 
        onupdate=datetime.utcnow
    )