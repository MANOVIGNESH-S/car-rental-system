from __future__ import annotations
from uuid import UUID
from datetime import datetime
from typing import Any
from asyncpg import Connection
from src.core.exceptions.base import NotFoundError

import asyncpg 

class UserRepository:
    @staticmethod
    async def get_by_id(conn: Connection, user_id: UUID) -> dict | None:
        row = await conn.fetchrow("SELECT * FROM users WHERE user_id = $1", user_id)
        return dict(row) if row else None

    @staticmethod
    async def get_by_email(conn: Connection, email: str) -> dict | None:
        row = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)
        return dict(row) if row else None

    @staticmethod
    async def create(
        conn: Connection, 
        full_name: str, 
        email: str, 
        phone_number: str, 
        password_hash: str
    ) -> dict:
        query = """
            INSERT INTO users (full_name, email, phone_number, password_hash)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        """
        row = await conn.fetchrow(query, full_name, email, phone_number, password_hash)
        return dict(row)

    @staticmethod
    async def update_kyc_status(
        conn: Connection, 
        user_id: UUID, 
        kyc_status: str, 
        reviewed_by: UUID | None
    ) -> None:
        query = """
            UPDATE users 
            SET kyc_status = $1, kyc_reviewed_by = $2, updated_at = NOW() 
            WHERE user_id = $3
        """
        await conn.execute(query, kyc_status, reviewed_by, user_id)

    @staticmethod
    async def update_profile(
        conn: Connection, 
        user_id: UUID, 
        full_name: str | None = None, 
        phone_number: str | None = None
    ) -> dict | None:
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
        
        query = f"""
            UPDATE users
            SET {', '.join(fields)}
            WHERE user_id = ${counter}
            RETURNING user_id, full_name, phone_number, updated_at;
        """
        row = await conn.fetchrow(query, *values)
        return dict(row) if row else None

    @staticmethod
    async def update_kyc_urls(
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

    @staticmethod
    async def get_kyc_status(conn: Connection, user_id: UUID) -> dict | None:
        query = """
            SELECT kyc_status, dl_expiry_date, extracted_address, kyc_verified_at 
            FROM users 
            WHERE user_id = $1
        """
        row = await conn.fetchrow(query, user_id)
        return dict(row) if row else None

    @staticmethod
    async def update_kyc_review(
        conn: Connection,
        user_id: UUID,
        kyc_status: str,
        kyc_reviewed_by: UUID,
        kyc_verified_at: datetime
    ) -> dict:
        if kyc_verified_at.tzinfo is not None:
            kyc_verified_at = kyc_verified_at.replace(tzinfo=None)
            
        query = """
            UPDATE users 
            SET kyc_status = $1, kyc_reviewed_by = $2, kyc_verified_at = $3, updated_at = NOW()
            WHERE user_id = $4 
            RETURNING user_id, kyc_status, kyc_verified_at, kyc_reviewed_by
        """
        row = await conn.fetchrow(
            query, 
            kyc_status, 
            kyc_reviewed_by, 
            kyc_verified_at, 
            user_id
        )
        if not row:
            raise NotFoundError("User")
        return dict(row)
    
    @staticmethod
    async def get_all_users(
        conn: Connection,
        kyc_status: str | None,
        role: str | None,
        is_suspended: bool | None,
        page: int,
        limit: int,
    ) -> tuple[list[dict], int]:
        offset = (page - 1) * limit
        count_query = """
            SELECT COUNT(*) 
            FROM users
            WHERE ($1::text IS NULL OR kyc_status = $1)
              AND ($2::text IS NULL OR role = $2)
              AND ($3::boolean IS NULL OR is_suspended = $3)
        """
        total = await conn.fetchval(count_query, kyc_status, role, is_suspended)
        select_query = """
            SELECT 
                user_id, full_name, email, phone_number, 
                role, kyc_status, is_suspended, created_at
            FROM users
            WHERE ($1::text IS NULL OR kyc_status = $1)
              AND ($2::text IS NULL OR role = $2)
              AND ($3::boolean IS NULL OR is_suspended = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
        """
        rows = await conn.fetch(select_query, kyc_status, role, is_suspended, limit, offset)
        return [dict(row) for row in rows], total

    @staticmethod
    async def update_suspension(
        conn: Connection,
        user_id: UUID,
        is_suspended: bool,
    ) -> dict:
        query = """
            UPDATE users
            SET is_suspended = $1, updated_at = NOW()
            WHERE user_id = $2
            RETURNING user_id, is_suspended, updated_at
        """
        row = await conn.fetchrow(query, is_suspended, user_id)
        return dict(row)

    @staticmethod
    async def update_role(
        conn: Connection,
        user_id: UUID,
        role: str,
    ) -> dict:
        query = """
            UPDATE users
            SET role = $1, updated_at = NOW()
            WHERE user_id = $2
            RETURNING user_id, role, updated_at
        """
        row = await conn.fetchrow(query, role, user_id)
        return dict(row)

    @staticmethod
    async def update_kyc_from_worker(
        conn: asyncpg.Connection,
        user_id: UUID,
        kyc_status: str,
        extracted_address: str | None,
        dl_expiry_date: date | None,
        kyc_verified_at: datetime | None,
    ) -> None:
        await conn.execute(
            """
            UPDATE users
            SET kyc_status=$1,
                extracted_address=$2,
                dl_expiry_date=$3,
                kyc_verified_at=$4,
                updated_at=NOW()
            WHERE user_id=$5
            """,
            kyc_status,
            extracted_address,
            dl_expiry_date,
            kyc_verified_at,
            user_id,
        )