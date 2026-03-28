from __future__ import annotations

from datetime import datetime
from uuid import UUID
from typing import Any

from asyncpg import Connection


class VehicleRepository:
    """
    Repository for raw asyncpg interaction with the 'vehicles' table.
    Strictly handles SQL execution and returns dictionaries.
    """

    async def get_available(
        self,
        conn: Connection,
        branch_tag: str | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        vehicle_type: str | None = None,
        fuel_type: str | None = None,
        transmission: str | None = None,
    ) -> list[dict[str, Any]]:
        query = "SELECT * FROM vehicles WHERE vehicle_status = 'available'"
        params = []
        counter = 1

        if branch_tag:
            query += f" AND branch_tag = ${counter}"
            params.append(branch_tag)
            counter += 1

        if vehicle_type:
            query += f" AND vehicle_type = ${counter}"
            params.append(vehicle_type)
            counter += 1

        if fuel_type:
            query += f" AND fuel_type = ${counter}"
            params.append(fuel_type)
            counter += 1

        if transmission:
            query += f" AND transmission = ${counter}"
            params.append(transmission)
            counter += 1

        if start_time and end_time:
            # Overlap logic with 2-hour buffer
            query += f"""
                AND NOT EXISTS (
                    SELECT 1 FROM bookings b
                    WHERE b.vehicle_id = vehicles.vehicle_id
                    AND b.status IN ('reserved', 'active')
                    AND b.start_time < ${counter + 1}
                    AND b.end_time + interval '2 hours' > ${counter}
                )
            """
            params.extend([start_time, end_time])
            counter += 2

        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]

    async def get_by_id(self, conn: Connection, vehicle_id: UUID) -> dict[str, Any] | None:
        query = "SELECT * FROM vehicles WHERE vehicle_id = $1"
        row = await conn.fetchrow(query, vehicle_id)
        return dict(row) if row else None

    async def create(self, conn: Connection, data: dict[str, Any]) -> dict[str, Any]:
        columns = ", ".join(data.keys())
        placeholders = ", ".join(f"${i+1}" for i in range(len(data)))
        query = f"INSERT INTO vehicles ({columns}) VALUES ({placeholders}) RETURNING *"
        row = await conn.fetchrow(query, *data.values())
        return dict(row)

    async def update(self, conn: Connection, vehicle_id: UUID, updates: dict[str, Any]) -> dict[str, Any]:
        set_clauses = []
        params = [vehicle_id]
        
        for i, (key, value) in enumerate(updates.items(), start=2):
            set_clauses.append(f"{key} = ${i}")
            params.append(value)
        
        set_query = ", ".join(set_clauses)
        query = f"""
            UPDATE vehicles 
            SET {set_query}, updated_at = NOW() 
            WHERE vehicle_id = $1 
            RETURNING *
        """
        row = await conn.fetchrow(query, *params)
        return dict(row)

    async def update_status(self, conn: Connection, vehicle_id: UUID, status: str) -> dict[str, Any]:
        query = """
            UPDATE vehicles 
            SET vehicle_status = $1, updated_at = NOW() 
            WHERE vehicle_id = $2 
            RETURNING *
        """
        row = await conn.fetchrow(query, status, vehicle_id)
        return dict(row)

    async def delete(self, conn: Connection, vehicle_id: UUID) -> None:
        query = "DELETE FROM vehicles WHERE vehicle_id = $1"
        await conn.execute(query, vehicle_id)

    async def has_active_bookings(self, conn: Connection, vehicle_id: UUID) -> bool:
        query = """
            SELECT EXISTS (
                SELECT 1 FROM bookings 
                WHERE vehicle_id = $1 AND status IN ('reserved', 'active')
            )
        """
        return await conn.fetchval(query, vehicle_id)

    async def get_expiring_docs(self, conn: Connection, days: int) -> list[dict[str, Any]]:
        query = f"""
            SELECT vehicle_id, brand, model, branch_tag, 
                   insurance_expiry_date, rc_expiry_date, puc_expiry_date
            FROM vehicles
            WHERE insurance_expiry_date <= NOW() + interval '{days} days'
               OR rc_expiry_date <= NOW() + interval '{days} days'
               OR puc_expiry_date <= NOW() + interval '{days} days'
            ORDER BY LEAST(insurance_expiry_date, rc_expiry_date, puc_expiry_date) ASC
        """
        rows = await conn.fetch(query)
        return [dict(row) for row in rows]
    async def update_doc_expiry_dates(
        self,
        conn: Connection,
        vehicle_id: UUID,
        insurance_expiry_date,
        rc_expiry_date,
        puc_expiry_date,
    ) -> None:
        await conn.execute(
            """
            UPDATE vehicles
            SET insurance_expiry_date = $1,
                rc_expiry_date = $2,
                puc_expiry_date = $3,
                updated_at = NOW()
            WHERE vehicle_id = $4
            """,
            insurance_expiry_date,
            rc_expiry_date,
            puc_expiry_date,
            vehicle_id,
        )