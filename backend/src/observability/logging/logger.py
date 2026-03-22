import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any

from src.config.settings import settings


class JSONFormatter(logging.Formatter):
    """Formats log records as structured JSON strings."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "name": record.name,
        }

        # Include 'extra' fields provided in the log call
        if hasattr(record, "__dict__"):
            for key, value in record.__dict__.items():
                if key not in [
                    "args", "asctime", "created", "exc_info", "exc_text", "filename",
                    "funcName", "levelname", "levelno", "lineno", "module", "msecs",
                    "msg", "name", "pathname", "process", "processName",
                    "relativeCreated", "stack_info", "thread", "threadName"
                ]:
                    log_data[key] = value

        return json.dumps(log_data)


def setup_logging() -> logging.Logger:
    """Initializes the root logger for the application."""
    root_logger = logging.getLogger("car_rental")
    
    # Map string log level from settings
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    root_logger.setLevel(level)

    # Standard out handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    
    if not root_logger.handlers:
        root_logger.addHandler(handler)
        
    return root_logger


# Initialize root logger
logger = setup_logging()


def get_logger(name: str) -> logging.Logger:
    """Returns a child logger with the specified name."""
    return logging.getLogger(f"car_rental.{name}")