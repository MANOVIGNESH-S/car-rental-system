from __future__ import annotations

from uuid import UUID
from typing import Any, Optional
from asyncpg import Connection

from src.core.exceptions.base import NotFoundError


class JobRepository:
    """
    Repository for raw asyncpg queries against the async_jobs table.
    Strictly handles data persistence with zero business logic.
    """

    async def create(
        self,
        conn: Connection,
        job_type: str,
        reference_id: UUID,
        reference_type: str,
    ) -> dict:
        query = """
            INSERT INTO async_jobs (job_type, reference_id, reference_type) 
            VALUES ($1, $2, $3) 
            RETURNING *
        """
        row = await conn.fetchrow(query, job_type, reference_id, reference_type)
        return dict(row)

    async def get_by_id(self, conn: Connection, job_id: UUID) -> dict | None:
        query = "SELECT * FROM async_jobs WHERE job_id = $1"
        row = await conn.fetchrow(query, job_id)
        return dict(row) if row else None

    async def update_status(
        self,
        conn: Connection,
        job_id: UUID,
        status: str,
        last_error: Optional[str] = None,
        celery_task_id: Optional[str] = None,
    ) -> None:
        query = """
            UPDATE async_jobs 
            SET status = $1, last_error = $2, celery_task_id = $3, updated_at = NOW() 
            WHERE job_id = $4
        """
        result = await conn.execute(query, status, last_error, celery_task_id, job_id)
        if result == "UPDATE 0":
            raise NotFoundError(f"Job with ID {job_id} not found")