from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Text, DateTime, func, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.data.models.postgres.base import Base


class AsyncJob(Base):
    """
    SQLAlchemy 2.0 ORM model for the async_jobs table.
    Tracks background tasks such as KYC verification, email notifications, or reporting.
    """

    __tablename__ = "async_jobs"

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4
    )
    
    job_type: Mapped[str] = mapped_column(String, nullable=False)
    
    reference_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    
    reference_type: Mapped[str] = mapped_column(String, nullable=False)
    
    status: Mapped[str] = mapped_column(
        String, 
        nullable=False, 
        server_default="queued", 
        default="queued"
    )
    
    retry_count: Mapped[int] = mapped_column(
        Integer, 
        nullable=False, 
        server_default="0", 
        default=0
    )
    
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    celery_task_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=func.now(), 
        default=datetime.utcnow
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=func.now(), 
        onupdate=func.now(), 
        default=datetime.utcnow
    )