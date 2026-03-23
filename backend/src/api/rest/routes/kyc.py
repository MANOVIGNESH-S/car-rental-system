from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile, status
from asyncpg import Connection

from src.api.rest.dependencies import get_current_user, get_db_connection, require_role
from src.constants.enums import UserRole
from src.core.services.kyc_service import KYCService
from src.data.repositories.user_repository import UserRepository
from src.data.repositories.job_repository import JobRepository
from src.schemas.kyc import (
    KYCUploadResponse, 
    KYCStatusResponse, 
    KYCReviewRequest, 
    KYCReviewResponse
)

# Routers
kyc_router = APIRouter()
kyc_admin_router = APIRouter()

async def get_kyc_service() -> KYCService:
    return KYCService(user_repo=UserRepository(), job_repo=JobRepository())

DBCnn = Annotated[Connection, Depends(get_db_connection)]
CurrentUser = Annotated[dict, Depends(get_current_user)]
Service = Annotated[KYCService, Depends(get_kyc_service)]


@kyc_router.post(
    "/upload",
    response_model=KYCUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_role(UserRole.customer))]
)
async def upload_kyc_documents(
    conn: DBCnn,
    current_user: CurrentUser,
    service: Service,
    license_image: UploadFile = File(...),
    selfie_image: UploadFile = File(...)
) -> KYCUploadResponse:
    return await service.upload_documents(
        conn=conn,
        user_id=current_user["user_id"],
        license_file=license_image,
        selfie_file=selfie_image
    )


@kyc_router.get(
    "/status",
    response_model=KYCStatusResponse,
    dependencies=[Depends(require_role(UserRole.customer))]
)
async def get_kyc_status(
    conn: DBCnn,
    current_user: CurrentUser,
    service: Service
) -> KYCStatusResponse:
    return await service.get_status(conn, current_user["user_id"])



@kyc_admin_router.patch(
    "/kyc/{user_id}/review",
    response_model=KYCReviewResponse,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))]
)
async def review_user_kyc(
    user_id: UUID,
    payload: KYCReviewRequest,
    conn: DBCnn,
    current_user: CurrentUser,
    service: Service
) -> KYCReviewResponse:
    return await service.review_kyc(
        conn=conn,
        target_user_id=user_id,
        decision=payload.decision,
        reviewed_by=current_user["user_id"],
        reason=payload.reason
    )