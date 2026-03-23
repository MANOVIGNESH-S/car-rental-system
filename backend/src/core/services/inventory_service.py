from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any
from uuid import UUID

from asyncpg import Connection

from src.constants.enums import VehicleStatus
from src.core.exceptions.base import ConflictError, NotFoundError, ValidationError
from src.data.repositories.vehicle_repository import VehicleRepository
from src.schemas.vehicle import (
    CreateVehicleRequest,
    ExpiringDocItem,
    UpdateStatusRequest,
    UpdateVehicleRequest,
    VehicleAdminResponse,
    VehicleDetailResponse,
    VehicleListItem,
)


class InventoryService:
    def __init__(self) -> None:
        self.vehicle_repo = VehicleRepository()

    async def get_available_vehicles(
        self,
        conn: Connection,
        branch_tag: str | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        vehicle_type: str | None = None,
        fuel_type: str | None = None,
        transmission: str | None = None,
    ) -> list[VehicleListItem]:
        vehicles = await self.vehicle_repo.get_available(
            conn, branch_tag, start_time, end_time, vehicle_type, fuel_type, transmission
        )
        
        return [
            VehicleListItem(
                **v,
                thumbnail_url=v["thumbnail_urls"][0] if v["thumbnail_urls"] else ""
            )
            for v in vehicles
        ]

    async def get_vehicle_detail(
        self, conn: Connection, vehicle_id: UUID
    ) -> VehicleDetailResponse:
        vehicle = await self.vehicle_repo.get_by_id(conn, vehicle_id)
        if not vehicle:
            raise NotFoundError("Vehicle")
        
        # VehicleDetailResponse schema automatically excludes sensitive URLs based on definition
        return VehicleDetailResponse(
            **vehicle,
            thumbnail_url=vehicle["thumbnail_urls"][0] if vehicle["thumbnail_urls"] else ""
        )

    async def create_vehicle(
        self, conn: Connection, data: CreateVehicleRequest
    ) -> VehicleAdminResponse:
        today = date.today()
        if any(
            dt < today 
            for dt in [data.insurance_expiry_date, data.rc_expiry_date, data.puc_expiry_date]
        ):
            raise ValidationError("Expiry date must be in the future")

        vehicle_data = data.model_dump()
        vehicle_data["vehicle_status"] = VehicleStatus.available.value
        
        new_vehicle = await self.vehicle_repo.create(conn, vehicle_data)
        return VehicleAdminResponse(
            **new_vehicle,
            thumbnail_url=new_vehicle["thumbnail_urls"][0]
        )

    async def update_vehicle(
        self, conn: Connection, vehicle_id: UUID, data: UpdateVehicleRequest
    ) -> VehicleAdminResponse:
        exists = await self.vehicle_repo.get_by_id(conn, vehicle_id)
        if not exists:
            raise NotFoundError("Vehicle")

        updates = data.model_dump(exclude_none=True)
        if not updates:
            return VehicleAdminResponse(
                **exists,
                thumbnail_url=exists["thumbnail_urls"][0]
            )

        updated_vehicle = await self.vehicle_repo.update(conn, vehicle_id, updates)
        return VehicleAdminResponse(
            **updated_vehicle,
            thumbnail_url=updated_vehicle["thumbnail_urls"][0]
        )

    async def update_vehicle_status(
        self, conn: Connection, vehicle_id: UUID, status: VehicleStatus
    ) -> VehicleAdminResponse:
        vehicle = await self.vehicle_repo.get_by_id(conn, vehicle_id)
        if not vehicle:
            raise NotFoundError("Vehicle")

        if status in (VehicleStatus.maintenance, VehicleStatus.retired):
            has_active = await self.vehicle_repo.has_active_bookings(conn, vehicle_id)
            if has_active:
                raise ConflictError("Cannot change status: active bookings exist")

        updated = await self.vehicle_repo.update_status(conn, vehicle_id, status.value)
        return VehicleAdminResponse(
            **updated,
            thumbnail_url=updated["thumbnail_urls"][0]
        )

    async def delete_vehicle(self, conn: Connection, vehicle_id: UUID) -> None:
        vehicle = await self.vehicle_repo.get_by_id(conn, vehicle_id)
        if not vehicle:
            raise NotFoundError("Vehicle")

        has_active = await self.vehicle_repo.has_active_bookings(conn, vehicle_id)
        if has_active:
            raise ConflictError("Cannot delete: active bookings exist")

        await self.vehicle_repo.delete(conn, vehicle_id)

    async def get_expiring_docs(self, conn: Connection, days: int) -> list[ExpiringDocItem]:
        vehicles = await self.vehicle_repo.get_expiring_docs(conn, days)
        today = date.today()
        results = []

        for v in vehicles:
            expiring_list = []
            docs = {
                "insurance": v["insurance_expiry_date"],
                "rc": v["rc_expiry_date"],
                "puc": v["puc_expiry_date"],
            }

            for doc_name, expiry_date in docs.items():
                days_left = (expiry_date - today).days
                if days_left <= days:
                    expiring_list.append({
                        "doc": doc_name,
                        "expiry_date": expiry_date.isoformat(),
                        "days_left": days_left
                    })

            results.append(ExpiringDocItem(
                vehicle_id=v["vehicle_id"],
                brand=v["brand"],
                model=v["model"],
                branch_tag=v["branch_tag"],
                expiring=expiring_list
            ))

        return results