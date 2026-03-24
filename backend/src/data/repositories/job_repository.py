from __future__ import annotations

from uuid import UUID
from typing import Any

from asyncpg import Connection

from src.core.exceptions.base import NotFoundError

import asyncpg


class JobRepository:

    @staticmethod
    async def create(
        conn: Connection,
        job_type: str,
        reference_id: UUID,
        reference_type: str,
    ) -> dict[str, Any]:
        row = await conn.fetchrow(
            """
            INSERT INTO async_jobs (job_type, reference_id, reference_type)
            VALUES ($1, $2, $3)
            RETURNING *
            """,
            job_type,
            reference_id,
            reference_type,
        )
        return dict(row) if row else {}

    @staticmethod
    async def get_by_id(
        conn: Connection,
        job_id: UUID,
    ) -> dict[str, Any] | None:
        row = await conn.fetchrow(
            "SELECT * FROM async_jobs WHERE job_id = $1",
            job_id,
        )
        return dict(row) if row else None

    @staticmethod
    async def update_status(
        conn: Connection,
        job_id: UUID,
        status: str,
        last_error: str | None = None,
        celery_task_id: str | None = None,
    ) -> None:
        result = await conn.execute(
            """
            UPDATE async_jobs
            SET status = $1, last_error = $2, celery_task_id = $3, updated_at = NOW()
            WHERE job_id = $4
            """,
            status,
            last_error,
            celery_task_id,
            job_id,
        )
        if result == "UPDATE 0":
            raise NotFoundError("Job")

    @staticmethod
    async def get_failed_and_stuck(
        conn: Connection,
        job_type: str | None = None,
        status: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        offset = (page - 1) * limit
        rows = await conn.fetch(
            """
            SELECT * FROM async_jobs
            WHERE ($1::text IS NULL OR job_type = $1)
            AND ($2::text IS NULL OR status = $2)
            ORDER BY updated_at DESC
            LIMIT $3 OFFSET $4
            """,
            job_type,
            status,
            limit,
            offset,
        )
        return [dict(r) for r in rows]

    @staticmethod
    async def increment_retry(
        conn: Connection,
        job_id: UUID,
    ) -> None:
        await conn.execute(
            """
            UPDATE async_jobs
            SET status = 'queued',
                retry_count = retry_count + 1,
                updated_at = NOW()
            WHERE job_id = $1
            """,
            job_id,
        )

    @staticmethod
    async def get_by_reference(
        conn: Any, 
        reference_id: UUID, 
        job_type: str
    ) -> dict | None:
        """Fetches the most recent job associated with a specific reference ID and type."""
        query = """
            SELECT * FROM async_jobs
            WHERE reference_id = $1 AND job_type = $2
            ORDER BY created_at DESC
            LIMIT 1
        """
        row = await conn.fetchrow(query, reference_id, job_type)
        return dict(row) if row else None
    
    @staticmethod
    async def get_all_with_filters(
        conn: Any,
        job_type: str | None,
        status: str | None,
        page: int,
        limit: int,
    ) -> tuple[list[dict[str, Any]], int]:
        """
        Fetches a paginated list of jobs with filters and calculates the 'is_stuck' flag.
        Returns a tuple of (jobs_list, total_count).
        """
        offset = (page - 1) * limit

        # 1. Get Total Count
        count_query = """
            SELECT COUNT(*) 
            FROM async_jobs 
            WHERE ($1::text IS NULL OR job_type = $1)
            AND ($2::text IS NULL OR status = $2)
        """
        total_count = await conn.fetchval(count_query, job_type, status)

        # 2. Get Paginated Data
        select_query = """
            SELECT *,
                CASE 
                    WHEN status = 'processing' 
                    AND updated_at < NOW() - interval '10 minutes' 
                    THEN true ELSE false 
                END AS is_stuck
            FROM async_jobs
            WHERE ($1::text IS NULL OR job_type = $1)
            AND ($2::text IS NULL OR status = $2)
            ORDER BY updated_at DESC
            LIMIT $3 OFFSET $4
        """
        rows = await conn.fetch(select_query, job_type, status, limit, offset)
        
        return [dict(r) for r in rows], total_count

    @staticmethod
    async def reset_for_retry(conn: Any, job_id: UUID) -> dict[str, Any]:
        """
        Resets a failed job to 'queued' status and increments the retry counter.
        Returns the updated record.
        """
        query = """
            UPDATE async_jobs
            SET status = 'queued',
                retry_count = retry_count + 1,
                last_error = NULL,
                updated_at = NOW()
            WHERE job_id = $1
            RETURNING *
        """
        row = await conn.fetchrow(query, job_id)
        return dict(row) if row else {}

    @staticmethod
    async def complete_job(
        conn: asyncpg.Connection,
        job_id: UUID,
        celery_task_id: str | None = None,
    ) -> None:
        await conn.execute(
            """
            UPDATE async_jobs
            SET status='completed',
                celery_task_id=$1,
                updated_at=NOW()
            WHERE job_id=$2
            """,
            celery_task_id,
            job_id,
        )

    @staticmethod
    async def fail_job(
        conn: asyncpg.Connection,
        job_id: UUID,
        last_error: str,
    ) -> None:
        await conn.execute(
            """
            UPDATE async_jobs
            SET status='failed',
                last_error=$1,
                updated_at=NOW()
            WHERE job_id=$2
            """,
            last_error,
            job_id,
        )