from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.constants.enums import FuelType, Transmission, VehicleStatus


class VehicleBase(BaseModel):
    brand: str
    model: str
    vehicle_type: str
    transmission: Transmission
    fuel_type: FuelType
    branch_tag: str
    hourly_rate: Decimal
    daily_rate: Decimal
    security_deposit: Decimal
    fuel_level_pct: int = Field(ge=0, le=100)

    model_config = ConfigDict(from_attributes=True)


class VehicleListItem(BaseModel):
    """Public list view with single hero image."""
    vehicle_id: UUID
    brand: str
    model: str
    vehicle_type: str
    transmission: Transmission
    fuel_type: FuelType
    branch_tag: str
    thumbnail_url: str  # Populated from thumbnail_urls[0] in service/repo
    hourly_rate: Decimal
    daily_rate: Decimal
    security_deposit: Decimal
    fuel_level_pct: int
    vehicle_status: VehicleStatus

    model_config = ConfigDict(from_attributes=True)


class VehicleDetailResponse(VehicleListItem):
    """Public single vehicle view with full gallery."""
    thumbnail_urls: list[str]
    created_at: datetime
    # Excludes sensitive document URLs


class VehicleAdminResponse(VehicleDetailResponse):
    """Full admin view including compliance documents and dates."""
    insurance_url: str
    rc_url: str
    puc_url: str
    insurance_expiry_date: date
    rc_expiry_date: date
    puc_expiry_date: date


class CreateVehicleRequest(VehicleBase):
    thumbnail_urls: list[str] = Field(min_length=1)
    insurance_expiry_date: date
    rc_expiry_date: date
    puc_expiry_date: date
    insurance_url: str
    rc_url: str
    puc_url: str


class UpdateVehicleRequest(BaseModel):
    """Partial update. Brand, model, type, and transmission are fixed."""
    branch_tag: str | None = None
    thumbnail_urls: list[str] | None = Field(None, min_length=1)
    hourly_rate: Decimal | None = None
    daily_rate: Decimal | None = None
    security_deposit: Decimal | None = None
    fuel_level_pct: int | None = Field(None, ge=0, le=100)
    insurance_expiry_date: date | None = None
    rc_expiry_date: date | None = None
    puc_expiry_date: date | None = None
    insurance_url: str | None = None
    rc_url: str | None = None
    puc_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UpdateStatusRequest(BaseModel):
    vehicle_status: VehicleStatus


class ExpiringDocItem(BaseModel):
    vehicle_id: UUID
    brand: str
    model: str
    branch_tag: str
    expiring: list[dict]  # [{"doc": "puc", "expiry_date": "...", "days_left": 21}]

    model_config = ConfigDict(from_attributes=True)