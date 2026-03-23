from __future__ import annotations

from typing import Annotated
from uuid import UUID
from datetime import datetime

from src import data
from fastapi import APIRouter, Depends, Query, status
from asyncpg import Connection

from src.api.rest.dependencies import get_db_connection, get_current_user, require_role
from src.constants.enums import UserRole
from src.schemas.booking import (
    CreateBookingRequest,
    CreateBookingResponse,
    BookingListItem,
    BookingDetailResponse,
    AdminBookingListItem,
    CheckinRequest,
    CheckinResponse,
    CheckoutRequest,
    CheckoutResponse
)
from src.core.services.booking_service import BookingService
from src.data.models.postgres.user import User

router = APIRouter()
admin_router = APIRouter()

# --- CUSTOMER ENDPOINTS ---

@router.post(
    "/", 
    response_model=CreateBookingResponse, 
    status_code=status.HTTP_201_CREATED
)
async def create_booking(
    data: CreateBookingRequest,
    current_user: Annotated[User, Depends(require_role(UserRole.customer))],
    conn: Annotated[Connection, Depends(get_db_connection)]
) -> CreateBookingResponse:
    return await BookingService.create_booking(conn, current_user["user_id"], data)

@router.get("/", response_model=list[BookingListItem])
async def get_my_bookings(
    current_user: Annotated[User, Depends(require_role(UserRole.customer))],
    conn: Annotated[Connection, Depends(get_db_connection)],
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
) -> list[BookingListItem]:
    return await BookingService.get_user_bookings(
        conn, current_user["user_id"], status, page, limit
    )


@router.get("/{booking_id}", response_model=BookingDetailResponse)
async def get_booking_details(
    booking_id: UUID,
    current_user: Annotated[User, Depends(require_role(UserRole.customer))],
    conn: Annotated[Connection, Depends(get_db_connection)]
) -> BookingDetailResponse:
    return await BookingService.get_booking_detail(conn, booking_id, current_user["user_id"])


@router.delete("/{booking_id}")
async def cancel_booking(
    booking_id: UUID,
    current_user: Annotated[User, Depends(require_role(UserRole.customer))],
    conn: Annotated[Connection, Depends(get_db_connection)]
) -> dict[str, str]:
    await BookingService.cancel_booking(conn, booking_id, current_user["user_id"])
    return {"message": "Booking cancelled", "booking_id": str(booking_id)}


# --- ADMIN/MANAGER ENDPOINTS ---

@admin_router.get("/admin/bookings", response_model=list[AdminBookingListItem])
async def get_all_bookings_admin(
    current_user: Annotated[User, Depends(require_role(UserRole.manager, UserRole.admin))],
    conn: Annotated[Connection, Depends(get_db_connection)],
    branch_tag: str | None = Query(None),
    status: str | None = Query(None),
    vehicle_id: UUID | None = Query(None),
    date: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
) -> list[AdminBookingListItem]:
    filters = {
        "branch_tag": branch_tag,
        "status": status,
        "vehicle_id": vehicle_id,
        "date": date,
        "page": page,
        "limit": limit
    }
    return await BookingService.get_admin_bookings(conn, filters)


@admin_router.patch("/admin/bookings/{booking_id}/checkin", response_model=CheckinResponse)
async def checkin_vehicle(
    booking_id: UUID,
    data: CheckinRequest,
    current_user: Annotated[User, Depends(require_role(UserRole.manager, UserRole.admin))],
    conn: Annotated[Connection, Depends(get_db_connection)]
) -> CheckinResponse:
    return await BookingService.checkin_booking(conn, booking_id, data.fuel_level_at_pickup)


@admin_router.patch("/admin/bookings/{booking_id}/checkout", response_model=CheckoutResponse)
async def checkout_vehicle(
    booking_id: UUID,
    data: CheckoutRequest,
    current_user: Annotated[User, Depends(require_role(UserRole.manager, UserRole.admin))],
    conn: Annotated[Connection, Depends(get_db_connection)]
) -> CheckoutResponse:
    return await BookingService.checkout_booking(conn, booking_id, data.fuel_level_at_return)