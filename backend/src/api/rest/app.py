from fastapi import FastAPI
from src.api.middleware.cors import register_cors
from src.api.middleware.error_handler import register_exception_handlers
from src.api.middleware.logging import RequestLoggingMiddleware
from src.api.rest.routes.auth import router as auth_router



def create_app() -> FastAPI:
    app = FastAPI(
        title="Car Rental API",
        version="1.0.0",
        openapi_url="/api/openapi.json"
    )

    register_cors(app)
    register_exception_handlers(app)
    app.add_middleware(RequestLoggingMiddleware)

    app.include_router(auth_router, prefix="/auth", tags=["Auth"])

    return app