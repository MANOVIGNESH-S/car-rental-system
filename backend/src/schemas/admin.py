from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_validator
from src.constants.enums import UserRole, KYCStatus

class AdminUserListItem(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    phone_number: str
    role: UserRole
    kyc_status: KYCStatus
    is_suspended: bool
    created_at: datetime
    dl_expiry_date: Optional[date] = None      # extracted by KYC worker
    extracted_address: Optional[str] = None    # extracted by KYC worker

    model_config = ConfigDict(from_attributes=True)

class AdminUserListResponse(BaseModel):
    users: list[AdminUserListItem]
    total: int
    page: int
    limit: int

class SuspendUserRequest(BaseModel):
    is_suspended: bool

class SuspendUserResponse(BaseModel):
    user_id: UUID
    is_suspended: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UpdateRoleRequest(BaseModel):
    role: UserRole

    @field_validator("role")
    @classmethod
    def validate_role_not_admin(cls, v: UserRole) -> UserRole:
        if v == UserRole.admin:
            raise ValueError("Cannot assign Admin role via API")
        return v

class UpdateRoleResponse(BaseModel):
    user_id: UUID
    role: UserRole
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AdminUserDetail(AdminUserListItem):
    """Extended user detail including presigned KYC document URLs."""
    selfie_url: Optional[str] = None
    license_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
