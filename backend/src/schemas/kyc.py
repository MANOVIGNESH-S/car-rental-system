from __future__ import annotations

from datetime import datetime, date
from uuid import UUID
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.constants.enums import KYCStatus


class KYCUploadResponse(BaseModel):
    """Response returned after successful file upload and job queuing."""
    message: str
    kyc_status: KYCStatus
    job_id: UUID


class KYCStatusResponse(BaseModel):
    """Current KYC status and extracted data for the customer."""
    kyc_status: KYCStatus
    dl_expiry_date: Optional[date] = None
    extracted_address: Optional[str] = None
    kyc_verified_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class KYCReviewRequest(BaseModel):
    """Admin/Manager request to approve or reject a KYC submission."""
    decision: Literal["verified", "failed"]
    reason: Optional[str] = None

    @model_validator(mode="after")
    def validate_reason_on_failure(self) -> KYCReviewRequest:
        if self.decision == "failed" and not self.reason:
            raise ValueError("reason required when decision is failed")
        return self


class KYCReviewResponse(BaseModel):
    """Response returned after an admin updates a KYC record."""
    user_id: UUID
    kyc_status: KYCStatus
    kyc_verified_at: Optional[datetime] = None
    kyc_reviewed_by: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)