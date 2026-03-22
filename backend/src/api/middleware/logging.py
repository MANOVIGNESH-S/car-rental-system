import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.observability.logging.logger import logger

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        start_time = time.perf_counter()
        
        logger.info(
            f"Incoming request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
            }
        )

        try:
            response = await call_next(request)
            process_time = (time.perf_counter() - start_time) * 1000
            
            logger.info(
                f"Request completed",
                extra={
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "process_time_ms": round(process_time, 2),
                }
            )
            
            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as e:
           
            logger.error(
                f"Request failed",
                extra={"request_id": request_id, "error": str(e)}
            )
            raise e