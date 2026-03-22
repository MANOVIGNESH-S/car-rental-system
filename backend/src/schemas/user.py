from datetime import datetime, date
from uuid import UUID
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.constants.enums import UserRole, KYCStatus


class ProfileResponse(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    phone_number: str
    role: UserRole
    kyc_status: KYCStatus
    dl_expiry_date: date | None
    is_suspended: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(
        default=None, 
        min_length=2, 
        max_length=100
    )
    phone_number: str | None = Field(
        default=None, 
        min_length=10, 
        max_length=15
    )

    @model_validator(mode="after")
    def validate_at_least_one_field(self) -> Self:
        if self.full_name is None and self.phone_number is None:
            raise ValueError("At least one field (full_name or phone_number) must be provided")
        return self


class UpdateProfileResponse(BaseModel):
    user_id: UUID
    full_name: str
    phone_number: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)