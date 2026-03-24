from uuid import UUID
from typing import Annotated, Any
from fastapi import APIRouter, Depends, Query, status

from src.api.rest.dependencies import get_db_connection, require_role
from src.constants.enums import UserRole
from src.core.services.job_service import JobService
from src.schemas.async_job import AsyncJobListResponse, RetryJobResponse

admin_router = APIRouter()

@admin_router.get(
    "/admin/jobs",
    response_model=AsyncJobListResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))]
)
async def list_admin_jobs(
    conn: Annotated[Any, Depends(get_db_connection)],
    job_type: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> AsyncJobListResponse:
    """
    Fetch a paginated list of all background jobs with optional filters.
    Accessible only by Managers and Admins.
    """
    return await JobService.list_jobs(
        conn=conn,
        job_type=job_type,
        status=status,
        page=page,
        limit=limit
    )

@admin_router.post(
    "/admin/jobs/{job_id}/retry",
    response_model=RetryJobResponse,
    status_code=status.HTTP_200_OK
)
async def retry_failed_job(
    job_id: UUID,
    conn: Annotated[Any, Depends(get_db_connection)],
    current_user: Annotated[dict[str, Any], Depends(require_role(UserRole.manager, UserRole.admin))],
) -> RetryJobResponse:
    """
    Manually trigger a retry for a failed job.
    Resets status to 'queued' and increments retry count.
    """
    return await JobService.retry_job(
        conn=conn,
        job_id=job_id,
        requested_by=current_user["user_id"]
    )