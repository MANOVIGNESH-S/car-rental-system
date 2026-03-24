from __future__ import annotations

from fastapi import APIRouter, Depends
from asyncpg import Connection

from src.api.rest.dependencies import get_db_connection

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check(
    conn: Connection = Depends(get_db_connection),
) -> dict:
    try:
        await conn.fetchval("SELECT 1")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
    }