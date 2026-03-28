from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated, List
from uuid import UUID

from asyncpg import Connection
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status

from src.api.rest.dependencies import get_db_connection, require_role
from src.constants.enums import FuelType, Transmission, UserRole
from src.core.services.inventory_service import InventoryService
from src.schemas.vehicle import (
    ExpiringDocItem,
    UpdateStatusRequest,
    UpdateVehicleRequest,
    VehicleAdminResponse,
    VehicleDetailResponse,
    VehicleListItem,
)

router = APIRouter()
admin_router = APIRouter()
inventory_service = InventoryService()


# ── Public endpoints ─────────────────────────────────────────────────────────

@router.get("/inventory", response_model=list[VehicleListItem])
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


@router.get("/inventory/{vehicle_id}", response_model=VehicleDetailResponse)
async def get_vehicle_details(
    vehicle_id: UUID,
    conn: Annotated[Connection, Depends(get_db_connection)],
):
    return await inventory_service.get_vehicle_detail(conn, vehicle_id)


# ── Admin endpoints ──────────────────────────────────────────────────────────

@admin_router.post(
    "/admin/vehicles",
    response_model=VehicleAdminResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))],
)
async def create_vehicle(
    conn: Annotated[Connection, Depends(get_db_connection)],
    brand: str = Form(...),
    model: str = Form(...),
    vehicle_type: str = Form(...),
    transmission: Transmission = Form(...),
    fuel_type: FuelType = Form(...),
    branch_tag: str = Form(...),
    hourly_rate: Decimal = Form(...),
    daily_rate: Decimal = Form(...),
    security_deposit: Decimal = Form(...),
    fuel_level_pct: int = Form(default=100),
    # ↓ Multiple images — Swagger will show individual file pickers
    vehicle_images: List[UploadFile] = File(..., description="Vehicle photos (JPG/PNG)"),
    insurance_doc: UploadFile = File(..., description="Insurance certificate (PDF)"),
    rc_doc: UploadFile = File(..., description="Registration certificate (PDF)"),
    puc_doc: UploadFile = File(..., description="PUC certificate (PDF)"),
) -> VehicleAdminResponse:
    
    return await inventory_service.create_vehicle(
        conn=conn,
        brand=brand,
        model=model,
        vehicle_type=vehicle_type,
        transmission=transmission.value,
        fuel_type=fuel_type.value,
        branch_tag=branch_tag,
        hourly_rate=hourly_rate,
        daily_rate=daily_rate,
        security_deposit=security_deposit,
        fuel_level_pct=fuel_level_pct,
        vehicle_images=vehicle_images,
        insurance_doc=insurance_doc,
        rc_doc=rc_doc,
        puc_doc=puc_doc,
    )


@admin_router.patch(
    "/admin/vehicles/{vehicle_id}",
    response_model=VehicleAdminResponse,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))],
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
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))],
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
    dependencies=[Depends(require_role(UserRole.admin))],
)
async def delete_vehicle(
    vehicle_id: UUID,
    conn: Annotated[Connection, Depends(get_db_connection)],
):
    await inventory_service.delete_vehicle(conn, vehicle_id)


@admin_router.get(
    "/admin/vehicles/expiring-docs",
    response_model=list[ExpiringDocItem],
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))],
)
async def get_expiring_docs(
    conn: Annotated[Connection, Depends(get_db_connection)],
    days: int = Query(default=30),
):
    return await inventory_service.get_expiring_docs(conn, days)
