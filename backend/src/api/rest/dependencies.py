import secrets
from typing import Annotated, AsyncGenerator, Callable

from fastapi import Depends, Header, Request
from fastapi.security import OAuth2PasswordBearer

from src.config.settings import settings
from src.constants.enums import UserRole
from src.core.exceptions.base import ForbiddenError, UnauthorizedError
from src.utils.jwt import decode_access_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_db_connection(request: Request) -> AsyncGenerator:
    """
    Yields an asyncpg connection from the pool initialized in main.py.
    Ensures the connection is released back to the pool after the request.
    """
    async with request.app.state.pool.acquire() as connection:
        yield connection


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    conn: Annotated[any, Depends(get_db_connection)]
) -> any:
    """
    Authenticates the user via JWT and fetches their record from the database.
    Note: Replace 'any' with your User ORM model once defined.
    """
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise UnauthorizedError("Invalid token payload")

    user = await conn.fetchrow("SELECT * FROM users WHERE user_id = $1", user_id)    
    
    if not user:
        raise UnauthorizedError("User not found")
        
    return user


def require_role(*roles: UserRole) -> Callable:
    """
    RBAC Factory. Returns a dependency that checks if the current user 
    has one of the allowed roles.
    """
    async def role_checker(
        current_user: Annotated[any, Depends(get_current_user)]
    ) -> any:
        if current_user["role"] not in [role.value for role in roles]:
            raise ForbiddenError(f"Role {current_user['role']} is not authorized")
        return current_user
        
    return role_checker


async def verify_internal_secret(
    x_internal_secret: Annotated[str, Header(alias="X-Internal-Secret")]
) -> None:
    """
    Timing-safe verification for internal webhooks or service-to-service calls.
    """
    if not secrets.compare_digest(x_internal_secret, settings.internal_secret):
        raise UnauthorizedError("Invalid internal secret")