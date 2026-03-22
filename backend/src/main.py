import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI

from src.api.rest.app import create_app
from src.data.clients.postgres_client import create_pool, close_pool
from src.data.clients.redis_client import create_redis, close_redis
from src.observability.logging.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_pool()
    app.state.redis = await create_redis()
    logger.info("Application started: Database pool and Redis initialized")
    
    yield
    
    await close_pool(app.state.pool)
    await close_redis(app.state.redis)
    logger.info("Application stopped: Connections closed")

app = create_app()
app.router.lifespan_context = lifespan

if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )