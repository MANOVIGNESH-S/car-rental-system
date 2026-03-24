import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID
from asyncpg import Connection

from src.config.settings import settings
from src.core.exceptions.base import ConflictError, UnauthorizedError
from src.data.repositories.session_repository import SessionRepository
from src.data.repositories.user_repository import UserRepository
from src.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshResponse,
    RegisterRequest,
    UserResponse,
)
from src.utils.hashing import hash_password, hash_token, verify_password, verify_token
from src.utils.jwt import create_access_token


class AuthService:
    def __init__(self) -> None:
        self.user_repo = UserRepository()
        self.session_repo = SessionRepository()

    async def register(
        self, 
        conn: Connection, 
        data: RegisterRequest
    ) -> UserResponse:
        """Handles new user creation with unique email enforcement."""
        existing_user = await self.user_repo.get_by_email(conn, data.email)
        if existing_user:
            raise ConflictError("Email already registered")

        pwd_hash = hash_password(data.password)
        
        user = await self.user_repo.create(
            conn=conn,
            full_name=data.full_name,
            email=data.email,
            phone_number=data.phone_number,
            password_hash=pwd_hash
        )

        return UserResponse.model_validate(dict(user))

    async def login(
        self, 
        conn: Connection, 
        data: LoginRequest
    ) -> tuple[LoginResponse, str]:
        """Authenticates user and initiates a secure session with token rotation."""
        user = await self.user_repo.get_by_email(conn, data.email)
        if not user or not verify_password(data.password, user["password_hash"]):
            raise UnauthorizedError("Invalid credentials")

        access_token = create_access_token({
            "sub": str(user["user_id"]),
            "role": user["role"]
        })

        raw_refresh_token = secrets.token_hex(64)
        refresh_hash = hash_token(raw_refresh_token)
        
        await self.session_repo.delete_by_user_id(conn, user["user_id"])
        
        expires_at = (
                datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
            ).replace(tzinfo=None)

        
        await self.session_repo.create(
            conn=conn,
            user_id=user["user_id"],
            refresh_token_hash=refresh_hash,
            expires_at=expires_at
        )

        response = LoginResponse(
            access_token=access_token,
            user=UserResponse.model_validate(dict(user))
        )
        
        return response, raw_refresh_token

    async def refresh(
        self, 
        conn: Connection, 
        refresh_token_cookie: str, 
        user_id: UUID
    ) -> tuple[RefreshResponse, str]:
        """Rotates tokens using the provided refresh token cookie."""
        session = await self.session_repo.get_by_user_id(conn, user_id)
        
        if not session:
            raise UnauthorizedError("Session not found")
            
        if session["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            await self.session_repo.delete_by_user_id(conn, user_id)
            raise UnauthorizedError("Session expired")

        if not verify_token(refresh_token_cookie, session["refresh_token_hash"]):
            await self.session_repo.delete_by_user_id(conn, user_id)
            raise UnauthorizedError("Invalid refresh token")

        user = await self.user_repo.get_by_id(conn, user_id)
        if not user:
            raise UnauthorizedError("User no longer exists")

        new_access_token = create_access_token({
            "sub": str(user["user_id"]),
            "role": user["role"]
        })
        new_raw_refresh_token = secrets.token_hex(64)
        new_refresh_hash = hash_token(new_raw_refresh_token)

        await self.session_repo.delete_by_user_id(conn, user_id)
        
        new_expires_at = (
            datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)).replace(tzinfo=None)
        
        await self.session_repo.create(
            conn=conn,
            user_id=user_id,
            refresh_token_hash=new_refresh_hash,
            expires_at=new_expires_at
        )

        return RefreshResponse(access_token=new_access_token), new_raw_refresh_token

    async def logout(self, conn: Connection, user_id: UUID) -> None:
        """Clears the session from the database."""
        await self.session_repo.delete_by_user_id(conn, user_id)