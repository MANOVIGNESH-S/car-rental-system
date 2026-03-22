from typing import Optional


class AppException(Exception):
    """
    Base exception for all application-specific errors.
    Captured by global middleware to return structured JSON responses.
    """
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.detail)


class NotFoundError(AppException):
    """Raised when a specific resource (User, Car, Booking) is missing."""
    def __init__(self, resource: str):
        self.resource = resource
        detail = f"{resource} not found"
        super().__init__(status_code=404, detail=detail)


class ConflictError(AppException):
    """Raised for resource collisions, like duplicate emails or overlapping bookings."""
    def __init__(self, detail: str):
        super().__init__(status_code=409, detail=detail)


class ForbiddenError(AppException):
    """Raised when a user is authenticated but lacks permission for an action."""
    def __init__(self, detail: str = "Access denied"):
        super().__init__(status_code=403, detail=detail)


class UnauthorizedError(AppException):
    """Raised when authentication credentials are missing or invalid."""
    def __init__(self, detail: str = "Authentication required"):
        super().__init__(status_code=401, detail=detail)


class ValidationError(AppException):
    """Raised for bad requests or business rule violations (e.g., invalid date range)."""
    def __init__(self, detail: str):
        super().__init__(status_code=400, detail=detail)


class SuspendedAccountError(AppException):
    """Raised when a user attempts to log in or act while suspended."""
    def __init__(self, detail: str = "Account suspended. Contact support."):
        super().__init__(status_code=403, detail=detail)


class KYCRequiredError(AppException):
    """Raised when a customer tries to book a car without a verified profile."""
    def __init__(self, detail: str = "KYC verification required before booking"):
        super().__init__(status_code=403, detail=detail)


class InternalServiceError(AppException):
    """Raised for unexpected failures or 3rd party service outages (S3, OpenAI, etc.)."""
    def __init__(self, detail: str = "An internal error occurred"):
        super().__init__(status_code=500, detail=detail)