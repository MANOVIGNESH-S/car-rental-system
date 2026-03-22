import asyncpg
from src.config.settings import settings

async def create_pool() -> asyncpg.Pool:
    """Initializes a connection pool for high-concurrency PostgreSQL access."""
    return await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=5,
        max_size=20,
        command_timeout=60.0
    )

async def close_pool(pool: asyncpg.Pool) -> None:
    """Gracefully closes all connections in the pool."""
    if pool:
        await pool.close()