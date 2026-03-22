import asyncpg
from src.config.settings import settings

async def create_pool() -> asyncpg.Pool:
    dsn = settings.database_url.replace("postgresql+asyncpg", "postgresql")
    return await asyncpg.create_pool(dsn=dsn, min_size=5, max_size=20)

async def close_pool(pool: asyncpg.Pool) -> None:
    """Gracefully closes all connections in the pool."""
    if pool:
        await pool.close()