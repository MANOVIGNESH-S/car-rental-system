from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from src.constants.enums import JobType, JobStatus, ReferenceType

class AsyncJobResponse(BaseModel):
    """
    Schema representing a background job record.
    Includes an 'is_stuck' computed field for administrative monitoring.
    """
    job_id: UUID
    job_type: JobType
    reference_id: UUID
    reference_type: ReferenceType
    status: JobStatus
    retry_count: int
    last_error: str | None = None
    celery_task_id: str | None = None
    created_at: datetime
    updated_at: datetime
    is_stuck: bool = False

    model_config = ConfigDict(from_attributes=True)

class AsyncJobListResponse(BaseModel):
    """
    Paginated response containing a list of async jobs.
    """
    jobs: list[AsyncJobResponse]
    total: int
    page: int
    limit: int

    model_config = ConfigDict(from_attributes=True)

class RetryJobResponse(BaseModel):
    """
    Response returned after successfully triggering a job retry.
    """
    job_id: UUID
    status: JobStatus
    retry_count: int
    message: str

    model_config = ConfigDict(from_attributes=True)