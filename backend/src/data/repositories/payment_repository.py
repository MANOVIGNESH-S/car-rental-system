from __future__ import annotations
from uuid import UUID
from typing import Any
from asyncpg import Connection

class PaymentRepository:
    @staticmethod
    async def create(
        conn: Connection,
        booking_id: UUID,
        initiated_by: UUID | None,
        amount: float,
        transaction_type: str,
        payment_method: str,
        status: str,
        mock_transaction_id: str | None = None
    ) -> dict[str, Any]:
        query = """
            INSERT INTO payments (
                booking_id, initiated_by, amount, transaction_type, 
                payment_method, status, mock_transaction_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        """
        row = await conn.fetchrow(
            query, booking_id, initiated_by, amount, 
            transaction_type, payment_method, status, mock_transaction_id
        )
        return dict(row)

    @staticmethod
    async def get_by_booking_id(conn: Connection, booking_id: UUID) -> list[dict[str, Any]]:
        query = "SELECT * FROM payments WHERE booking_id = $1 ORDER BY timestamp ASC;"
        rows = await conn.fetch(query, booking_id)
        return [dict(r) for r in rows]