from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from src.config.settings import settings
from src.core.exceptions.base import UnauthorizedError

ALGORITHM = "HS256"


def create_access_token(data: dict) -> str:
    """Generates a JWT access token with an expiration timestamp."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    """Decodes and validates the JWT, raising UnauthorizedError if invalid or expired."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise UnauthorizedError("Invalid token type")
        return payload
    except JWTError:
        raise UnauthorizedError("Could not validate credentials")

def decode_token_ignore_expiry(token: str) -> dict:
    """Decodes JWT without validating expiry — used only for token refresh.
    Still validates signature and token type."""
    try:
        payload = jwt.decode(
            token, 
            settings.secret_key, 
            algorithms=[ALGORITHM],
            options={"verify_exp": False}
        )
        if payload.get("type") != "access":
            raise UnauthorizedError("Invalid token type")
        return payload
    except JWTError:
        raise UnauthorizedError("Could not validate credentials")