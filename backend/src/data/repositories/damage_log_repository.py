from __future__ import annotations
from uuid import UUID
from typing import Any
from asyncpg import Connection

import asyncpg

class DamageLogRepository:
    @staticmethod
    async def create_empty(conn: Connection, booking_id: UUID) -> dict[str, Any]:
        query = "INSERT INTO damage_logs (booking_id) VALUES ($1) RETURNING *;"
        row = await conn.fetchrow(query, booking_id)
        return dict(row)

    @staticmethod
    async def get_by_booking_id(conn: Connection, booking_id: UUID) -> dict[str, Any] | None:
        query = "SELECT * FROM damage_logs WHERE booking_id = $1;"
        row = await conn.fetchrow(query, booking_id)
        return dict(row) if row else None

    @staticmethod
    async def update_pre_images(conn: Connection, booking_id: UUID, urls: list[str]) -> None:
        query = "UPDATE damage_logs SET pre_rental_image_urls = $1 WHERE booking_id = $2;"
        await conn.execute(query, urls, booking_id)

    @staticmethod
    async def update_post_images(conn: Connection, booking_id: UUID, urls: list[str]) -> None:
        query = "UPDATE damage_logs SET post_rental_image_urls = $1 WHERE booking_id = $2;"
        await conn.execute(query, urls, booking_id)

    @staticmethod
    async def update_fuel_pickup(conn: Connection, booking_id: UUID, fuel_level: int) -> None:
        query = "UPDATE damage_logs SET fuel_level_at_pickup = $1 WHERE booking_id = $2;"
        await conn.execute(query, fuel_level, booking_id)

    @staticmethod
    async def update_fuel_return(conn: Connection, booking_id: UUID, fuel_level: int) -> None:
        query = "UPDATE damage_logs SET fuel_level_at_return = $1 WHERE booking_id = $2;"
        await conn.execute(query, fuel_level, booking_id)

    @staticmethod
    async def update_classification(
        conn: Any, 
        booking_id: UUID, 
        classification: str
    ) -> None:
        """Updates the LLM classification for a specific booking's damage log."""
        query = """
            UPDATE damage_logs
            SET llm_classification = $1
            WHERE booking_id = $2
        """
        await conn.execute(query, classification, booking_id)

    @staticmethod
    async def update_llm_classification(
        conn: asyncpg.Connection,
        booking_id: UUID,
        classification: str,
    ) -> None:
        await conn.execute(
            """
            UPDATE damage_logs
            SET llm_classification=$1
            WHERE booking_id=$2
            """,
            classification,
            booking_id,
        )