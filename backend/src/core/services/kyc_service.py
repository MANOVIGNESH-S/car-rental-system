from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import UploadFile

from src.core.exceptions.base import (
    NotFoundError, 
    ConflictError, 
    ValidationError
)
from src.constants.enums import KYCStatus
from src.data.repositories.user_repository import UserRepository
from src.data.repositories.job_repository import JobRepository
from src.data.clients.s3_client import s3_client
from src.schemas.kyc import (
    KYCUploadResponse, 
    KYCStatusResponse, 
    KYCReviewResponse
)
from src.observability.logging.logger import get_logger

logger = get_logger(__name__)

class KYCService:
    def __init__(
        self, 
        user_repo: UserRepository, 
        job_repo: JobRepository
    ) -> None:
        self.user_repo = user_repo
        self.job_repo = job_repo

    async def upload_documents(
        self,
        conn,
        user_id: uuid.UUID,
        license_file: UploadFile,
        selfie_file: UploadFile,
    ) -> KYCUploadResponse:
        allowed_types = ["image/jpeg", "image/png"]
        max_size = 5 * 1024 * 1024  # 5MB

        for file in [license_file, selfie_file]:
            if file.content_type not in allowed_types:
                raise ValidationError("Only JPG and PNG files are allowed")
            
           
            file_bytes = await file.read()
            if len(file_bytes) > max_size:
                raise ValidationError("File size must not exceed 5MB")
            
            file.file.seek(0)

        license_bytes = await license_file.read()
        selfie_bytes = await selfie_file.read()

        license_key = f"kyc/{user_id}/license.jpg"
        license_url = await s3_client.upload_file(
            license_bytes, license_key, license_file.content_type
        )

        selfie_key = f"kyc/{user_id}/selfie.jpg"
        selfie_url = await s3_client.upload_file(
            selfie_bytes, selfie_key, selfie_file.content_type
        )

        current_data = await self.user_repo.get_kyc_status(conn, user_id)
        if not current_data:
            raise NotFoundError(f"User {user_id} not found")
        
        if current_data["kyc_status"] == KYCStatus.verified:
            raise ConflictError("KYC already verified")

        await self.user_repo.update_kyc_urls(conn, user_id, license_url, selfie_url)

        job = await self.job_repo.create(
            conn, 
            job_type="kyc_verification", 
            reference_id=user_id, 
            reference_type="user"
        )

        from src.workers.kyc_worker import run_kyc_verification
        run_kyc_verification.delay(
            job_id=str(job["job_id"]),
            user_id=str(user_id),
        )
        
        logger.info(f"KYC job enqueued to Celery: {job['job_id']} for user {user_id}")

        return KYCUploadResponse(
            message="Documents uploaded. Verification in progress.",
            kyc_status=KYCStatus.pending,
            job_id=job["job_id"]
        )

    async def get_status(self, conn, user_id: uuid.UUID) -> KYCStatusResponse:
        data = await self.user_repo.get_kyc_status(conn, user_id)
        if data is None:
            raise NotFoundError(f"User {user_id} not found")
        
        return KYCStatusResponse.model_validate(data)

    async def review_kyc(
        self,
        conn,
        target_user_id: uuid.UUID,
        decision: str,
        reviewed_by: uuid.UUID,
        reason: Optional[str] = None,
    ) -> KYCReviewResponse:
        user = await self.user_repo.get_by_id(conn, target_user_id)
        if not user:
            raise NotFoundError(f"User {target_user_id} not found")

        updated = await self.user_repo.update_kyc_review(
            conn,
            user_id=target_user_id,
            kyc_status=decision,
            kyc_reviewed_by=reviewed_by,
            kyc_verified_at=datetime.now(timezone.utc).replace(tzinfo=None)
        )

        return KYCReviewResponse.model_validate(updated)