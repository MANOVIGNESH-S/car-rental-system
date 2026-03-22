from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.constants.enums import UserRole, KYCStatus


class RegisterRequest(BaseModel):
    """Schema for new user registration."""
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone_number: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    """Schema for user login credentials."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for returning user details in API responses."""
    user_id: UUID
    full_name: str
    email: str
    role: UserRole
    kyc_status: KYCStatus
    is_suspended: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginResponse(BaseModel):
    """
    Schema for successful login.
    Note: refresh_token is excluded as it is handled via HttpOnly cookies.
    """
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshResponse(BaseModel):
    """Schema for a successful token rotation."""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Schema representing the decoded JWT payload."""
    user_id: UUID
    role: UserRole
    exp: int