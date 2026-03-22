from __future__ import annotations
from uuid import UUID
from asyncpg import Connection
from src.data.models.postgres.user import User

class UserRepository:
    async def get_by_id(self, conn: Connection, user_id: UUID) -> User | None:
        """Fetch a single user by their primary key."""
        row = await conn.fetchrow("SELECT * FROM users WHERE user_id = $1", user_id)
        return User(**dict(row)) if row else None

    async def get_by_email(self, conn: Connection, email: str) -> User | None:
        """Fetch a single user by their unique email address."""
        row = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)
        return User(**dict(row)) if row else None

    async def create(
        self, 
        conn: Connection, 
        full_name: str, 
        email: str, 
        phone_number: str, 
        password_hash: str
    ) -> User:
        """Insert a new user record and return the created entity."""
        query = """
            INSERT INTO users (full_name, email, phone_number, password_hash)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        """
        row = await conn.fetchrow(query, full_name, email, phone_number, password_hash)
        return User(**dict(row))

    async def update_kyc_status(
        self, 
        conn: Connection, 
        user_id: UUID, 
        kyc_status: str, 
        reviewed_by: UUID | None
    ) -> None:
        """Update KYC status and reviewer for a specific user."""
        query = """
            UPDATE users 
            SET kyc_status = $1, kyc_reviewed_by = $2, updated_at = NOW() 
            WHERE user_id = $3
        """
        await conn.execute(query, kyc_status, reviewed_by, user_id)