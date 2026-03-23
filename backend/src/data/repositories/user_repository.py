from __future__ import annotations
from uuid import UUID
from asyncpg import Connection
from src.data.models.postgres.user import User
from typing import Any


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




    async def update_profile(
        self, 
        conn: Connection, 
        user_id: UUID, 
        full_name: str | None = None, 
        phone_number: str | None = None
    ) -> dict[str, Any] | None:
        """
        Dynamically updates user profile fields and returns the updated record.
        """
        fields = []
        values = []
        counter = 1

        if full_name is not None:
            fields.append(f"full_name = ${counter}")
            values.append(full_name)
            counter += 1

        if phone_number is not None:
            fields.append(f"phone_number = ${counter}")
            values.append(phone_number)
            counter += 1

        fields.append("updated_at = NOW()")
        
        values.append(user_id)
        where_clause = f"${counter}"

        query = f"""
            UPDATE users
            SET {', '.join(fields)}
            WHERE user_id = {where_clause}
            RETURNING user_id, full_name, phone_number, updated_at;
        """

        row = await conn.fetchrow(query, *values)
        return dict(row) if row else None
    

    async def update_kyc_urls(
            self, 
            conn: Connection, 
            user_id: UUID, 
            license_url: str, 
            selfie_url: str
        ) -> None:
            query = """
                UPDATE users 
                SET license_url = $1, selfie_url = $2, updated_at = NOW() 
                WHERE user_id = $3
            """
            await conn.execute(query, license_url, selfie_url, user_id)

    async def get_kyc_status(self, conn: Connection, user_id: UUID) -> dict | None:
        query = """
            SELECT kyc_status, dl_expiry_date, extracted_address, kyc_verified_at 
            FROM users 
            WHERE user_id = $1
        """
        row = await conn.fetchrow(query, user_id)
        return dict(row) if row else None

    async def update_kyc_review(
        self,
        conn: Connection,
        user_id: UUID,
        kyc_status: str,
        kyc_reviewed_by: UUID,
        kyc_verified_at: datetime
    ) -> dict:
        query = """
            UPDATE users 
            SET kyc_status = $1, kyc_reviewed_by = $2, kyc_verified_at = $3, updated_at = NOW() 
            WHERE user_id = $4 
            RETURNING user_id, kyc_status, kyc_verified_at, kyc_reviewed_by
        """
        row = await conn.fetchrow(query, kyc_status, kyc_reviewed_by, kyc_verified_at, user_id)
        if not row:
            raise NotFoundError(f"User with ID {user_id} not found")
        return dict(row)