from __future__ import annotations
from datetime import datetime
from uuid import UUID
from asyncpg import Connection
from src.data.models.postgres.user import Session

class SessionRepository:
    async def create(
        self, 
        conn: Connection, 
        user_id: UUID, 
        refresh_token_hash: str, 
        expires_at: datetime
    ) -> Session:
        """Store a new hashed refresh token session."""
        query = """
            INSERT INTO sessions (user_id, refresh_token_hash, expires_at)
            VALUES ($1, $2, $3) 
            RETURNING *
        """
        row = await conn.fetchrow(query, user_id, refresh_token_hash, expires_at)
        return Session(**dict(row))

    async def get_by_user_id(self, conn: Connection, user_id: UUID) -> Session | None:
        """Retrieve a session by the user's ID."""
        row = await conn.fetchrow("SELECT * FROM sessions WHERE user_id = $1", user_id)
        return Session(**dict(row)) if row else None

    async def delete_by_user_id(self, conn: Connection, user_id: UUID) -> None:
        """Invalidate all sessions for a specific user (Logout/Rotation)."""
        await conn.execute("DELETE FROM sessions WHERE user_id = $1", user_id)