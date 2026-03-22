import redis.asyncio as redis
from src.config.settings import settings

async def create_redis() -> redis.Redis:
    """Creates an asynchronous Redis client for caching and Celery results."""
    return redis.from_url(
        settings.redis_url, 
        encoding="utf-8", 
        decode_responses=True
    )

async def close_redis(r: redis.Redis) -> None:
    """Closes the Redis connection safely."""
    if r:
        await r.aclose()