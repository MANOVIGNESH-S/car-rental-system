from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status

from src.constants.enums import UserRole
from src.api.rest.dependencies import get_current_user, require_role, get_db_connection
from src.schemas.admin import (
    AdminUserListResponse,
    SuspendUserRequest,
    SuspendUserResponse,
    UpdateRoleRequest,
    UpdateRoleResponse
)
from src.core.services.admin_service import AdminService

admin_router = APIRouter()

@admin_router.get(
    "/admin/users",
    response_model=AdminUserListResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(UserRole.admin))]
)
async def list_users(
    conn: Annotated[any, Depends(get_db_connection)],
    kyc_status: str | None = Query(None),
    role: str | None = Query(None),
    is_suspended: bool | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    return await AdminService.list_users(
        conn=conn,
        kyc_status=kyc_status,
        role=role,
        is_suspended=is_suspended,
        page=page,
        limit=limit
    )

@admin_router.patch(
    "/admin/users/{user_id}/suspend",
    response_model=SuspendUserResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(UserRole.admin))]
)
async def suspend_user(
    user_id: UUID,
    data: SuspendUserRequest,
    conn: Annotated[any, Depends(get_db_connection)],
    current_user: Annotated[dict, Depends(get_current_user)]
):
    return await AdminService.suspend_user(
        conn=conn,
        target_user_id=user_id,
        is_suspended=data.is_suspended,
        requesting_admin_id=current_user["user_id"]
    )

@admin_router.patch(
    "/admin/users/{user_id}/role",
    response_model=UpdateRoleResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(UserRole.admin))]
)
async def update_user_role(
    user_id: UUID,
    data: UpdateRoleRequest,
    conn: Annotated[any, Depends(get_db_connection)],
    current_user: Annotated[dict, Depends(get_current_user)]
):
    return await AdminService.update_user_role(
        conn=conn,
        target_user_id=user_id,
        new_role=data.role.value,
        requesting_admin_id=current_user["user_id"]
    )