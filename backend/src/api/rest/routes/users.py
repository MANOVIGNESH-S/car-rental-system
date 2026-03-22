from typing import Annotated
from fastapi import APIRouter, Depends
from asyncpg import Connection

from src.api.rest.dependencies import get_db_connection, get_current_user
from src.core.services.user_service import UserService
from src.data.repositories.user_repository import UserRepository
from src.schemas.user import (
    ProfileResponse, 
    UpdateProfileRequest, 
    UpdateProfileResponse
)

router = APIRouter()

# Dependency Injection for the Service
def get_user_service() -> UserService:
    return UserService(UserRepository())

UserServ = Annotated[UserService, Depends(get_user_service)]
DbConn = Annotated[Connection, Depends(get_db_connection)]
CurrentUser = Annotated[dict, Depends(get_current_user)]

@router.get(
    "/me", 
    response_model=ProfileResponse,
    status_code=200
)
async def get_my_profile(
    conn: DbConn,
    current_user: CurrentUser,
    service: UserServ
) -> ProfileResponse:
    """
    Retrieve the authenticated user's profile information.
    """
    return await service.get_profile(conn, current_user["user_id"])


@router.patch(
    "/me", 
    response_model=UpdateProfileResponse,
    status_code=200
)
async def update_my_profile(
    data: UpdateProfileRequest,
    conn: DbConn,
    current_user: CurrentUser,
    service: UserServ
) -> UpdateProfileResponse:
    """
    Update specific fields (full_name, phone_number) of the user's profile.
    """
    return await service.update_profile(conn, current_user["user_id"], data)