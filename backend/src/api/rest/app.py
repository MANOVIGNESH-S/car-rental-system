from fastapi import FastAPI
from src.api.middleware.cors import register_cors
from src.api.middleware.error_handler import register_exception_handlers
from src.api.middleware.logging import RequestLoggingMiddleware
from src.api.rest.routes.auth import router as auth_router
from src.api.rest.routes.users import router as users_router
from src.api.rest.routes.kyc import kyc_router, kyc_admin_router
from src.api.rest.routes.inventory import router as inventory_router, admin_router as inventory_admin_router

from src.api.rest.routes.bookings import router as bookings_router
from src.api.rest.routes.bookings import admin_router as bookings_admin_router

from src.api.rest.routes.damage import router as damage_router
from src.api.rest.routes.damage import admin_router as damage_admin_router


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
    app.include_router(users_router, prefix="/users", tags=["Users"])
    app.include_router(kyc_router, prefix="/kyc", tags=["KYC"])
    app.include_router(kyc_admin_router, prefix="/admin", tags=["Admin - KYC"])

    app.include_router(inventory_router, prefix="/inventory", tags=["Inventory"])
    app.include_router(inventory_admin_router, prefix="", tags=["Admin - Inventory"])

    app.include_router(bookings_router, prefix="/bookings", tags=["Bookings"])
    app.include_router(bookings_admin_router, prefix="", tags=["Admin - Bookings"])

    app.include_router(damage_router, prefix="", tags=["Damage"])
    app.include_router(damage_admin_router, prefix="", tags=["Admin - Damage"])


    return app