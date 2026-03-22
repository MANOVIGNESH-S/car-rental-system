from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from asyncpg import Connection

from src.api.rest.dependencies import get_db_connection, get_current_user
from src.config.settings import settings
from src.core.services.auth_service import AuthService
from src.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshResponse,
    RegisterRequest,
    UserResponse,
)

router = APIRouter()
auth_service = AuthService()


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="strict",
        path="/auth/refresh",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    conn: Annotated[Connection, Depends(get_db_connection)],
) -> UserResponse:
    return await auth_service.register(conn, data)


@router.post("/login", response_model=LoginResponse)
async def login(
    response: Response,
    conn: Annotated[Connection, Depends(get_db_connection)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> LoginResponse:
    data = LoginRequest(email=form_data.username, password=form_data.password)
    login_data, raw_token = await auth_service.login(conn, data)
    _set_refresh_cookie(response, raw_token)
    return login_data


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    response: Response,
    conn: Annotated[Connection, Depends(get_db_connection)],
    refresh_token: Annotated[str, Cookie()],
    current_user: Annotated[any, Depends(get_current_user)],
) -> RefreshResponse:
    user_id: UUID = current_user["user_id"]
    refresh_data, new_raw_token = await auth_service.refresh(conn, refresh_token, user_id)
    _set_refresh_cookie(response, new_raw_token)
    return refresh_data


@router.post("/logout")
async def logout(
    response: Response,
    conn: Annotated[Connection, Depends(get_db_connection)],
    current_user: Annotated[any, Depends(get_current_user)],
) -> dict[str, str]:
    await auth_service.logout(conn, current_user["user_id"])
    response.delete_cookie(key="refresh_token", path="/auth/refresh")
    return {"message": "logged out successfully"}