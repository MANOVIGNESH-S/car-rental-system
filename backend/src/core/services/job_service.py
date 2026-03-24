from uuid import UUID
from typing import Any
from src.data.repositories.job_repository import JobRepository
from src.core.exceptions.base import NotFoundError, ConflictError
from src.schemas.async_job import AsyncJobListResponse, AsyncJobResponse, RetryJobResponse
from src.constants.enums import JobStatus
from src.observability.logging.logger import get_logger

logger = get_logger(__name__)

class JobService:
    @staticmethod
    async def list_jobs(
        conn: Any,
        job_type: str | None,
        status: str | None,
        page: int,
        limit: int,
    ) -> AsyncJobListResponse:
        """
        Retrieves a filtered and paginated list of async jobs.
        Includes 'is_stuck' logic processed at the repository level.
        """
        rows, total = await JobRepository.get_all_with_filters(
            conn=conn, 
            job_type=job_type, 
            status=status, 
            page=page, 
            limit=limit
        )

        job_list = [
            AsyncJobResponse(
                job_id=row["job_id"],
                job_type=row["job_type"],
                reference_id=row["reference_id"],
                reference_type=row["reference_type"],
                status=row["status"],
                retry_count=row["retry_count"],
                last_error=row.get("last_error"),
                celery_task_id=row.get("celery_task_id"),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                is_stuck=row.get("is_stuck", False),
            )
            for row in rows
        ]

        return AsyncJobListResponse(
            jobs=job_list,
            total=total,
            page=page,
            limit=limit
        )

    @staticmethod
    async def retry_job(
        conn: Any,
        job_id: UUID,
        requested_by: UUID,
    ) -> RetryJobResponse:
        """
        Logic to reset a failed job back to queued status.
        Validates existence and current status before updating.
        """
        # 1. Check existence
        job = await JobRepository.get_by_id(conn, job_id)
        if not job:
            raise NotFoundError("Job")

        # 2. Business Rule: Only failed jobs can be retried
        if job["status"] != JobStatus.failed:
            raise ConflictError("Only failed jobs can be retried")

        # 3. Perform update
        updated = await JobRepository.reset_for_retry(conn, job_id)

        # 4. Log the administrative action
        logger.info(f"Job {job_id} queued for retry by {requested_by}")

        return RetryJobResponse(
            job_id=job_id,
            status=JobStatus.queued,
            retry_count=updated["retry_count"],
            message="Job re-enqueued successfully",
        )