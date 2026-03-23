from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, String, Integer, DateTime, text, CheckConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from src.data.models.postgres.base import Base

class DamageLog(Base):
    __tablename__ = "damage_logs"

    log_id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    booking_id: Mapped[UUID] = mapped_column(ForeignKey("bookings.booking_id"), nullable=False)
    
    pre_rental_image_urls: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    post_rental_image_urls: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    
    fuel_level_at_pickup: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fuel_level_at_return: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    llm_classification: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("NOW()"))

    __table_args__ = (
        CheckConstraint('fuel_level_at_pickup >= 0 AND fuel_level_at_pickup <= 100', name='check_fuel_pickup_range'),
        CheckConstraint('fuel_level_at_return >= 0 AND fuel_level_at_return <= 100', name='check_fuel_return_range'),
    )