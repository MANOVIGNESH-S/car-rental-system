from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    """Hashes a plain-text password using bcrypt (12 rounds by default)."""
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    """Verifies a plain-text password against a hashed version."""
    return pwd_context.verify(plain, hashed)

def hash_token(token: str) -> str:
    """Hashes a refresh token for secure database storage."""
    return pwd_context.hash(token)

def verify_token(token: str, hashed: str) -> bool:
    """Verifies a refresh token against its stored hash."""
    return pwd_context.verify(token, hashed)