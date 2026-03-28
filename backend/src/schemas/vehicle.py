from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.constants.enums import FuelType, Transmission, VehicleStatus


class VehicleListItem(BaseModel):
    vehicle_id: UUID
    brand: str
    model: str
    vehicle_type: str
    transmission: Transmission
    fuel_type: FuelType
    branch_tag: str
    thumbnail_url: str
    hourly_rate: Decimal
    daily_rate: Decimal
    security_deposit: Decimal
    fuel_level_pct: int
    vehicle_status: VehicleStatus
    model_config = ConfigDict(from_attributes=True)


class VehicleDetailResponse(VehicleListItem):
    thumbnail_urls: list[str]
    created_at: datetime


class VehicleAdminResponse(VehicleDetailResponse):
    insurance_url: str
    rc_url: str
    puc_url: str
    insurance_expiry_date: date | None = None
    rc_expiry_date: date | None = None
    puc_expiry_date: date | None = None
    doc_extraction_status: str | None = None


class CreateVehicleRequest(BaseModel):
    """
    Core vehicle attributes only. Files are uploaded via multipart/form-data.
    Expiry dates are auto-extracted by the AI worker.
    """
    brand: str
    model: str
    vehicle_type: str
    transmission: Transmission
    fuel_type: FuelType
    branch_tag: str
    hourly_rate: Decimal
    daily_rate: Decimal
    security_deposit: Decimal
    fuel_level_pct: int = Field(ge=0, le=100, default=100)
    model_config = ConfigDict(from_attributes=True)


class UpdateVehicleRequest(BaseModel):
    branch_tag: str | None = None
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
    expiring: list[dict]
    model_config = ConfigDict(from_attributes=True)
