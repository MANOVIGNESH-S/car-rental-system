from fastapi import FastAPI
from src.api.middleware.cors import register_cors
from src.api.middleware.error_handler import register_exception_handlers
from src.api.middleware.logging import RequestLoggingMiddleware

# Placeholder imports for routers - ensure these files exist
# from src.api.rest.routers import auth, users, kyc, inventory, bookings, admin, webhooks

def create_app() -> FastAPI:
    app = FastAPI(
        title="Car Rental API",
        version="1.0.0",
        openapi_url="/api/openapi.json"
    )

    # Register Middlewares
    register_cors(app)
    register_exception_handlers(app)
    app.add_middleware(RequestLoggingMiddleware)

    # Include Routers (Assuming standard APIRouter setup)
    # app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
    # app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
    # app.include_router(kyc.router, prefix="/api/v1/kyc", tags=["KYC"])
    # app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
    # app.include_router(bookings.router, prefix="/api/v1/bookings", tags=["Bookings"])
    # app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
    # app.include_router(webhooks.router, prefix="/api/v1/internal/webhooks", tags=["Webhooks"])

    return app