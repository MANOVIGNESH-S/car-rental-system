from __future__ import annotations

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import ARRAY, CheckConstraint, ForeignKey, Numeric, String, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.constants.enums import FuelType, Transmission, VehicleStatus
from src.data.models.postgres.base import Base


class Vehicle(Base):
    """
    SQLAlchemy model representing the 'vehicles' table.
    Contains inventory details, technical specifications, and document links.
    """

    __tablename__ = "vehicles"

    vehicle_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    brand: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String, nullable=False)
    transmission: Mapped[Transmission] = mapped_column(String, nullable=False)
    fuel_type: Mapped[FuelType] = mapped_column(String, nullable=False)
    branch_tag: Mapped[str] = mapped_column(String, nullable=False)
    thumbnail_urls: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    
    fuel_level_pct: Mapped[int] = mapped_column(
        server_default=text("100"), nullable=False
    )
    
    hourly_rate: Mapped[float] = mapped_column(Numeric, nullable=False)
    daily_rate: Mapped[float] = mapped_column(Numeric, nullable=False)
    security_deposit: Mapped[float] = mapped_column(Numeric, nullable=False)
    
    insurance_expiry_date: Mapped[date] = mapped_column(nullable=False)
    rc_expiry_date: Mapped[date] = mapped_column(nullable=False)
    puc_expiry_date: Mapped[date] = mapped_column(nullable=False)
    
    insurance_url: Mapped[str] = mapped_column(String, nullable=False)
    rc_url: Mapped[str] = mapped_column(String, nullable=False)
    puc_url: Mapped[str] = mapped_column(String, nullable=False)
    
    vehicle_status: Mapped[VehicleStatus] = mapped_column(
        String, server_default=text("'available'"), nullable=False
    )
    
    created_at: Mapped[datetime] = mapped_column(
        server_default=text("now()"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=text("now()"), onupdate=text("now()"), nullable=False
    )

    __table_args__ = (
        CheckConstraint("fuel_level_pct >= 0 AND fuel_level_pct <= 100", name="fuel_level_range"),
    )