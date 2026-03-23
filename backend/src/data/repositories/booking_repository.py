from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import Any

from asyncpg import Connection


class BookingRepository:

    @staticmethod
    async def create(
        conn: Connection,
        user_id: UUID,
        vehicle_id: UUID,
        start_time: datetime,
        end_time: datetime,
        rental_fee: Decimal,
        security_deposit: Decimal,
        total_price: Decimal,
    ) -> dict[str, Any]:
        row = await conn.fetchrow(
            """
            INSERT INTO bookings (
                user_id, vehicle_id, start_time, end_time,
                rental_fee, security_deposit, total_price, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'reserved')
            RETURNING *
            """,
            user_id,
            vehicle_id,
            start_time,
            end_time,
            rental_fee,
            security_deposit,
            total_price,
        )
        return dict(row) if row else {}

    @staticmethod
    async def get_by_id(
        conn: Connection,
        booking_id: UUID,
    ) -> dict[str, Any] | None:
        row = await conn.fetchrow(
            """
            SELECT b.*,
                   u.full_name AS user_name,
                   u.phone_number AS user_phone,
                   v.brand AS vehicle_brand,
                   v.model AS vehicle_model,
                   v.branch_tag,
                   v.thumbnail_urls AS vehicle_thumbnail_urls
            FROM bookings b
            JOIN users u ON b.user_id = u.user_id
            JOIN vehicles v ON b.vehicle_id = v.vehicle_id
            WHERE b.booking_id = $1
            """,
            booking_id,
        )
        return dict(row) if row else None

    @staticmethod
    async def get_by_user(
        conn: Connection,
        user_id: UUID,
        status: str | None,
        page: int,
        limit: int,
    ) -> list[dict[str, Any]]:
        offset = (page - 1) * limit
        rows = await conn.fetch(
            """
            SELECT b.*,
                   v.brand AS vehicle_brand,
                   v.model AS vehicle_model,
                   v.thumbnail_urls
            FROM bookings b
            JOIN vehicles v ON b.vehicle_id = v.vehicle_id
            WHERE b.user_id = $1
            AND ($2::text IS NULL OR b.status = $2)
            ORDER BY b.created_at DESC
            LIMIT $3 OFFSET $4
            """,
            user_id,
            status,
            limit,
            offset,
        )
        return [dict(r) for r in rows]

    @staticmethod
    async def get_all_admin(
        conn: Connection,
        branch_tag: str | None,
        status: str | None,
        vehicle_id: UUID | None,
        date: datetime | None,
        page: int,
        limit: int,
    ) -> list[dict[str, Any]]:
        offset = (page - 1) * limit
        rows = await conn.fetch(
            """
            SELECT b.*,
                   u.full_name AS user_name,
                   u.phone_number AS user_phone,
                   v.brand AS vehicle_brand,
                   v.model AS vehicle_model,
                   v.branch_tag
            FROM bookings b
            JOIN users u ON b.user_id = u.user_id
            JOIN vehicles v ON b.vehicle_id = v.vehicle_id
            WHERE ($1::text IS NULL OR v.branch_tag = $1)
            AND ($2::text IS NULL OR b.status = $2)
            AND ($3::uuid IS NULL OR b.vehicle_id = $3)
            AND ($4::timestamp IS NULL OR b.start_time::date = $4::date)
            ORDER BY b.created_at DESC
            LIMIT $5 OFFSET $6
            """,
            branch_tag,
            status,
            vehicle_id,
            date,
            limit,
            offset,
        )
        return [dict(r) for r in rows]

    @staticmethod
    async def lock_vehicle_for_booking(
        conn: Connection,
        vehicle_id: UUID,
    ) -> dict[str, Any] | None:
        row = await conn.fetchrow(
            "SELECT * FROM vehicles WHERE vehicle_id = $1 FOR UPDATE",
            vehicle_id,
        )
        return dict(row) if row else None

    @staticmethod
    async def check_booking_overlap(
        conn: Connection,
        vehicle_id: UUID,
        start_time: datetime,
        end_time: datetime,
    ) -> bool:
        count = await conn.fetchval(
            """
            SELECT COUNT(*) FROM bookings
            WHERE vehicle_id = $1
            AND status IN ('reserved', 'active')
            AND start_time < $3
            AND (end_time + interval '2 hours') > $2
            """,
            vehicle_id,
            start_time,
            end_time,
        )
        return (count or 0) > 0

    @staticmethod
    async def cancel(
        conn: Connection,
        booking_id: UUID,
    ) -> dict[str, Any]:
        row = await conn.fetchrow(
            """
            UPDATE bookings
            SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
            WHERE booking_id = $1
            RETURNING *
            """,
            booking_id,
        )
        return dict(row) if row else {}

    @staticmethod
    async def update_checkin(
        conn: Connection,
        booking_id: UUID,
    ) -> dict[str, Any]:
        row = await conn.fetchrow(
            """
            UPDATE bookings
            SET status = 'active',
                is_physically_verified = true,
                updated_at = NOW()
            WHERE booking_id = $1
            RETURNING *
            """,
            booking_id,
        )
        return dict(row) if row else {}

    @staticmethod
    async def update_checkout(
        conn: Connection,
        booking_id: UUID,
    ) -> dict[str, Any]:
        row = await conn.fetchrow(
            """
            UPDATE bookings
            SET status = 'completed',
                actual_end_time = NOW(),
                updated_at = NOW()
            WHERE booking_id = $1
            RETURNING *
            """,
            booking_id,
        )
        return dict(row) if row else {}