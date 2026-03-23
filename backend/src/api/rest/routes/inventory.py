from __future__ import annotations

from datetime import datetime
from uuid import UUID
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from asyncpg import Connection

from src.api.rest.dependencies import get_current_user, get_db_connection, require_role
from src.constants.enums import FuelType, Transmission, UserRole, VehicleStatus
from src.core.services.inventory_service import InventoryService
from src.schemas.vehicle import (
    CreateVehicleRequest,
    ExpiringDocItem,
    UpdateStatusRequest,
    UpdateVehicleRequest,
    VehicleAdminResponse,
    VehicleDetailResponse,
    VehicleListItem,
)

# Public Router
router = APIRouter()
# Admin Router
admin_router = APIRouter()

inventory_service = InventoryService()


# --- PUBLIC ENDPOINTS ---

@router.get(
    "/inventory",
    response_model=list[VehicleListItem],
    status_code=status.HTTP_200_OK
)
async def get_inventory(
    conn: Annotated[Connection, Depends(get_db_connection)],
    branch_tag: str | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    vehicle_type: str | None = None,
    fuel_type: FuelType | None = None,
    transmission: Transmission | None = None,
):
    return await inventory_service.get_available_vehicles(
        conn=conn,
        branch_tag=branch_tag,
        start_time=start_time,
        end_time=end_time,
        vehicle_type=vehicle_type,
        fuel_type=fuel_type.value if fuel_type else None,
        transmission=transmission.value if transmission else None,
    )


@router.get(
    "/inventory/{vehicle_id}",
    response_model=VehicleDetailResponse,
    status_code=status.HTTP_200_OK
)
async def get_vehicle_details(
    vehicle_id: UUID,
    conn: Annotated[Connection, Depends(get_db_connection)],
):
    return await inventory_service.get_vehicle_detail(conn, vehicle_id)


# --- ADMIN ENDPOINTS ---

@admin_router.post(
    "/admin/vehicles",
    response_model=VehicleAdminResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))]
)
async def create_vehicle(
    data: CreateVehicleRequest,
    conn: Annotated[Connection, Depends(get_db_connection)],
):
    return await inventory_service.create_vehicle(conn, data)


@admin_router.patch(
    "/admin/vehicles/{vehicle_id}",
    response_model=VehicleAdminResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))]
)
async def update_vehicle(
    vehicle_id: UUID,
    data: UpdateVehicleRequest,
    conn: Annotated[Connection, Depends(get_db_connection)],
):
    return await inventory_service.update_vehicle(conn, vehicle_id, data)


@admin_router.patch(
    "/admin/vehicles/{vehicle_id}/status",
    response_model=VehicleAdminResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))]
)
async def update_vehicle_status(
    vehicle_id: UUID,
    data: UpdateStatusRequest,
    conn: Annotated[Connection, Depends(get_db_connection)],
):
    return await inventory_service.update_vehicle_status(conn, vehicle_id, data.vehicle_status)


@admin_router.delete(
    "/admin/vehicles/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(UserRole.admin))]
)
async def delete_vehicle(
    vehicle_id: UUID,
    conn: Annotated[Connection, Depends(get_db_connection)],
):
    await inventory_service.delete_vehicle(conn, vehicle_id)


@admin_router.get(
    "/admin/vehicles/expiring-docs",
    response_model=list[ExpiringDocItem],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))]
)
async def get_expiring_docs(
    conn: Annotated[Connection, Depends(get_db_connection)],
    days: int = Query(default=30),
):
    return await inventory_service.get_expiring_docs(conn, days)