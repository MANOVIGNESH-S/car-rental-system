from datetime import datetime
from decimal import Decimal
from typing import Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from src.constants.enums import DamageClassification


class DamageImageUploadResponse(BaseModel):
    """Response schema for successful image uploads (pre/post rental)."""
    booking_id: UUID
    image_type: Literal["pre_rental", "post_rental"]
    uploaded_urls: list[str]
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DamageLogResponse(BaseModel):
    """Full view of a damage log, typically for admin/manager review."""
    log_id: UUID
    booking_id: UUID
    pre_rental_image_urls: list[str] | None
    post_rental_image_urls: list[str] | None
    fuel_level_at_pickup: int | None
    fuel_level_at_return: int | None
    llm_classification: DamageClassification | None
    created_at: datetime
    damage_job: dict | None = None

    model_config = ConfigDict(from_attributes=True)


class DamageResolveRequest(BaseModel):
    """Request schema for managers to resolve Amber/Red damage flags."""
    decision: Literal["clear", "charge"]
    damage_amount: Decimal | None = None
    notes: str

    @model_validator(mode="after")
    def validate_charge_details(self) -> Self:
        if self.decision == "charge":
            if self.damage_amount is None:
                raise ValueError("damage_amount required when decision is charge")
            if self.damage_amount <= Decimal("0"):
                raise ValueError("damage_amount must be greater than 0")
        return self

    model_config = ConfigDict(from_attributes=True)


class DamageResolveResponse(BaseModel):
    """Summary of the financial resolution applied to a booking."""
    booking_id: UUID
    resolution: str
    damage_amount: Decimal | None
    refund_amount: Decimal | None
    payment_records_created: list[UUID]

    model_config = ConfigDict(from_attributes=True)