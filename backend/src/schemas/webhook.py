from datetime import date
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from src.constants.enums import JobStatus, KYCStatus, DamageClassification


class KYCResultWebhookRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: UUID
    user_id: UUID
    status: JobStatus
    kyc_decision: KYCStatus
    extracted_address: str | None = None
    dl_expiry_date: date | None = None
    face_match_score: float | None = None
    error: str | None = None


class DamageResultWebhookRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: UUID
    booking_id: UUID
    status: JobStatus
    classification: DamageClassification
    llm_reasoning: str | None = None
    error: str | None = None


class WebhookAckResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    acknowledged: bool = True