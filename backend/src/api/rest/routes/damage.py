from uuid import UUID
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, UploadFile, status
from src.api.rest.dependencies import get_db_connection, require_role
from src.constants.enums import UserRole
from src.core.services.damage_service import DamageService
from src.schemas.damage import (
    DamageImageUploadResponse,
    DamageLogResponse,
    DamageResolveRequest,
    DamageResolveResponse,
)

router = APIRouter()
admin_router = APIRouter()

@router.post(
    "/bookings/{booking_id}/damage/pre",
    response_model=DamageImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))]
)
async def upload_pre_rental_damage_images(
    booking_id: UUID,
    front_exterior: UploadFile = File(...),
    rear_exterior: UploadFile = File(...),
    left_exterior: UploadFile = File(...),
    right_exterior: UploadFile = File(...),
    dashboard: UploadFile = File(...),
    rear_seats: UploadFile = File(...),
    boot_interior: UploadFile = File(...),
    conn: Annotated[Any, Depends(get_db_connection)] = None,
):
    files = [
        front_exterior, rear_exterior, left_exterior, right_exterior,
        dashboard, rear_seats, boot_interior
    ]
    return await DamageService.upload_pre_images(conn, booking_id, files)


@router.post(
    "/bookings/{booking_id}/damage/post",
    response_model=DamageImageUploadResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_post_rental_damage_images(
    booking_id: UUID,
    current_user: Annotated[dict, Depends(require_role(UserRole.customer))],
    front_exterior: UploadFile = File(...),
    rear_exterior: UploadFile = File(...),
    left_exterior: UploadFile = File(...),
    right_exterior: UploadFile = File(...),
    dashboard: UploadFile = File(...),
    rear_seats: UploadFile = File(...),
    boot_interior: UploadFile = File(...),
    conn: Annotated[Any, Depends(get_db_connection)] = None,
):
    files = [
        front_exterior, rear_exterior, left_exterior, right_exterior,
        dashboard, rear_seats, boot_interior
    ]
    return await DamageService.upload_post_images(
        conn, booking_id, current_user["user_id"], files
    )


@admin_router.get(
    "/admin/damage/{booking_id}",
    response_model=DamageLogResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))]
)
async def get_damage_log_details(
    booking_id: UUID,
    conn: Annotated[Any, Depends(get_db_connection)] = None,
):
    return await DamageService.get_damage_log(conn, booking_id)


@admin_router.patch(
    "/admin/damage/{booking_id}/resolve",
    response_model=DamageResolveResponse,
    status_code=status.HTTP_200_OK
)
async def resolve_damage_claim(
    booking_id: UUID,
    data: DamageResolveRequest,
    current_user: Annotated[dict, Depends(require_role(UserRole.manager, UserRole.admin))],
    conn: Annotated[Any, Depends(get_db_connection)] = None,
):
    return await DamageService.resolve_damage(
        conn,
        booking_id=booking_id,
        decision=data.decision,
        damage_amount=data.damage_amount,
        notes=data.notes,
        resolved_by=current_user["user_id"],
    )