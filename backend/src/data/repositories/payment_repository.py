from __future__ import annotations
from decimal import Decimal
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
    
    @staticmethod
    async def get_total_by_booking(conn: Any, booking_id: UUID) -> dict[str, Decimal]:
        """
        Calculates aggregate totals for charges and refunds for a specific booking.
        """
        query = """
            SELECT 
                COALESCE(SUM(amount) FILTER (
                    WHERE transaction_type IN ('rental_fee', 'security_deposit', 'damage_charge')
                ), 0) AS total_charged,
                COALESCE(SUM(amount) FILTER (
                    WHERE transaction_type = 'refund'
                ), 0) AS total_refunded
            FROM payments
            WHERE booking_id = $1
        """
        row = await conn.fetchrow(query, booking_id)
        
        # Ensure values are returned as Decimal for financial precision
        return {
            "total_charged": Decimal(str(row["total_charged"])),
            "total_refunded": Decimal(str(row["total_refunded"]))
        }

    @staticmethod
    async def get_security_deposit_payment(conn: Any, booking_id: UUID) -> dict[str, Any] | None:
        """
        Retrieves the most recent successful security deposit for a booking.
        Used primarily for verifying refund eligibility.
        """
        query = """
            SELECT * FROM payments 
            WHERE booking_id = $1 
            AND transaction_type = 'security_deposit' 
            AND status = 'completed'
            ORDER BY timestamp DESC 
            LIMIT 1
        """
        row = await conn.fetchrow(query, booking_id)
        return dict(row) if row else None