#!/bin/bash
# Run this from your backend/ directory:
#   cd path/to/car-rental-system/backend
#   bash apply_changes.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ">>> Patching files..."

# 1. enums.py
cat > src/constants/enums.py << 'PYEOF'
from enum import Enum


class UserRole(str, Enum):
    admin = "Admin"
    manager = "Manager"
    customer = "Customer"


class KYCStatus(str, Enum):
    pending = "pending"
    verified = "verified"
    failed = "failed"
    needs_review = "needs_review"


class VehicleStatus(str, Enum):
    available = "available"
    maintenance = "maintenance"
    retired = "retired"


class Transmission(str, Enum):
    manual = "Manual"
    automatic = "Automatic"


class FuelType(str, Enum):
    petrol = "Petrol"
    diesel = "Diesel"
    ev = "EV"
    hybrid = "Hybrid"


class BookingStatus(str, Enum):
    reserved = "reserved"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class PaymentMethod(str, Enum):
    upi = "UPI"
    card = "card"
    cash = "cash"


class TransactionType(str, Enum):
    rental_fee = "rental_fee"
    security_deposit = "security_deposit"
    refund = "refund"
    damage_charge = "damage_charge"


class PaymentStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class DamageClassification(str, Enum):
    green = "Green"
    amber = "Amber"
    red = "Red"
    needs_review = "needs_review"


class JobType(str, Enum):
    kyc_verification = "kyc_verification"
    damage_assessment = "damage_assessment"
    email_notification = "email_notification"
    vehicle_doc_extraction = "vehicle_doc_extraction"


class JobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ReferenceType(str, Enum):
    user = "user"
    booking = "booking"
    vehicle = "vehicle"
PYEOF
echo "  [OK] enums.py"

# 2. schemas/vehicle.py
cat > src/schemas/vehicle.py << 'PYEOF'
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.constants.enums import FuelType, Transmission, VehicleStatus


class VehicleListItem(BaseModel):
    vehicle_id: UUID
    brand: str
    model: str
    vehicle_type: str
    transmission: Transmission
    fuel_type: FuelType
    branch_tag: str
    thumbnail_url: str
    hourly_rate: Decimal
    daily_rate: Decimal
    security_deposit: Decimal
    fuel_level_pct: int
    vehicle_status: VehicleStatus
    model_config = ConfigDict(from_attributes=True)


class VehicleDetailResponse(VehicleListItem):
    thumbnail_urls: list[str]
    created_at: datetime


class VehicleAdminResponse(VehicleDetailResponse):
    insurance_url: str
    rc_url: str
    puc_url: str
    insurance_expiry_date: date | None = None
    rc_expiry_date: date | None = None
    puc_expiry_date: date | None = None
    doc_extraction_status: str | None = None


class CreateVehicleRequest(BaseModel):
    """
    Core vehicle attributes only. Files are uploaded via multipart/form-data.
    Expiry dates are auto-extracted by the AI worker.
    """
    brand: str
    model: str
    vehicle_type: str
    transmission: Transmission
    fuel_type: FuelType
    branch_tag: str
    hourly_rate: Decimal
    daily_rate: Decimal
    security_deposit: Decimal
    fuel_level_pct: int = Field(ge=0, le=100, default=100)
    model_config = ConfigDict(from_attributes=True)


class UpdateVehicleRequest(BaseModel):
    branch_tag: str | None = None
    hourly_rate: Decimal | None = None
    daily_rate: Decimal | None = None
    security_deposit: Decimal | None = None
    fuel_level_pct: int | None = Field(None, ge=0, le=100)
    insurance_expiry_date: date | None = None
    rc_expiry_date: date | None = None
    puc_expiry_date: date | None = None
    insurance_url: str | None = None
    rc_url: str | None = None
    puc_url: str | None = None
    model_config = ConfigDict(from_attributes=True)


class UpdateStatusRequest(BaseModel):
    vehicle_status: VehicleStatus


class ExpiringDocItem(BaseModel):
    vehicle_id: UUID
    brand: str
    model: str
    branch_tag: str
    expiring: list[dict]
    model_config = ConfigDict(from_attributes=True)
PYEOF
echo "  [OK] schemas/vehicle.py"

# 3. routes/inventory.py  — THE CORE FIX (Form + File instead of JSON body)
cat > src/api/rest/routes/inventory.py << 'PYEOF'
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated, List
from uuid import UUID

from asyncpg import Connection
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status

from src.api.rest.dependencies import get_db_connection, require_role
from src.constants.enums import FuelType, Transmission, UserRole
from src.core.services.inventory_service import InventoryService
from src.schemas.vehicle import (
    ExpiringDocItem,
    UpdateStatusRequest,
    UpdateVehicleRequest,
    VehicleAdminResponse,
    VehicleDetailResponse,
    VehicleListItem,
)

router = APIRouter()
admin_router = APIRouter()
inventory_service = InventoryService()


# ── Public endpoints ─────────────────────────────────────────────────────────

@router.get("/inventory", response_model=list[VehicleListItem])
async def get_inventory(
    conn: Annotated[Connection, Depends(get_db_connection)],
    branch_tag: str | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    vehicle_type: str | None = None,
    fuel_type: FuelType | None = None,
    transmission: Transmission | None = None,
):
    return await inventory_service.get_available_vehicles(
        conn=conn,
        branch_tag=branch_tag,
        start_time=start_time,
        end_time=end_time,
        vehicle_type=vehicle_type,
        fuel_type=fuel_type.value if fuel_type else None,
        transmission=transmission.value if transmission else None,
    )


@router.get("/inventory/{vehicle_id}", response_model=VehicleDetailResponse)
async def get_vehicle_details(
    vehicle_id: UUID,
    conn: Annotated[Connection, Depends(get_db_connection)],
):
    return await inventory_service.get_vehicle_detail(conn, vehicle_id)


# ── Admin endpoints ──────────────────────────────────────────────────────────

@admin_router.post(
    "/admin/vehicles",
    response_model=VehicleAdminResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))],
)
async def create_vehicle(
    conn: Annotated[Connection, Depends(get_db_connection)],
    brand: str = Form(...),
    model: str = Form(...),
    vehicle_type: str = Form(...),
    transmission: Transmission = Form(...),
    fuel_type: FuelType = Form(...),
    branch_tag: str = Form(...),
    hourly_rate: Decimal = Form(...),
    daily_rate: Decimal = Form(...),
    security_deposit: Decimal = Form(...),
    fuel_level_pct: int = Form(default=100),
    # ↓ Multiple images — Swagger will show individual file pickers
    vehicle_images: List[UploadFile] = File(..., description="Vehicle photos (JPG/PNG)"),
    insurance_doc: UploadFile = File(..., description="Insurance certificate (PDF)"),
    rc_doc: UploadFile = File(..., description="Registration certificate (PDF)"),
    puc_doc: UploadFile = File(..., description="PUC certificate (PDF)"),
) -> VehicleAdminResponse:
    return await inventory_service.create_vehicle(
        conn=conn,
        brand=brand,
        model=model,
        vehicle_type=vehicle_type,
        transmission=transmission.value,
        fuel_type=fuel_type.value,
        branch_tag=branch_tag,
        hourly_rate=hourly_rate,
        daily_rate=daily_rate,
        security_deposit=security_deposit,
        fuel_level_pct=fuel_level_pct,
        vehicle_images=vehicle_images,
        insurance_doc=insurance_doc,
        rc_doc=rc_doc,
        puc_doc=puc_doc,
    )


@admin_router.patch(
    "/admin/vehicles/{vehicle_id}",
    response_model=VehicleAdminResponse,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))],
)
async def update_vehicle(
    vehicle_id: UUID,
    data: UpdateVehicleRequest,
    conn: Annotated[Connection, Depends(get_db_connection)],
):
    return await inventory_service.update_vehicle(conn, vehicle_id, data)


@admin_router.patch(
    "/admin/vehicles/{vehicle_id}/status",
    response_model=VehicleAdminResponse,
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))],
)
async def update_vehicle_status(
    vehicle_id: UUID,
    data: UpdateStatusRequest,
    conn: Annotated[Connection, Depends(get_db_connection)],
):
    return await inventory_service.update_vehicle_status(conn, vehicle_id, data.vehicle_status)


@admin_router.delete(
    "/admin/vehicles/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(UserRole.admin))],
)
async def delete_vehicle(
    vehicle_id: UUID,
    conn: Annotated[Connection, Depends(get_db_connection)],
):
    await inventory_service.delete_vehicle(conn, vehicle_id)


@admin_router.get(
    "/admin/vehicles/expiring-docs",
    response_model=list[ExpiringDocItem],
    dependencies=[Depends(require_role(UserRole.manager, UserRole.admin))],
)
async def get_expiring_docs(
    conn: Annotated[Connection, Depends(get_db_connection)],
    days: int = Query(default=30),
):
    return await inventory_service.get_expiring_docs(conn, days)
PYEOF
echo "  [OK] routes/inventory.py"

# 4. inventory_service.py
cat > src/core/services/inventory_service.py << 'PYEOF'
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from asyncpg import Connection
from fastapi import UploadFile

from src.constants.enums import JobType, ReferenceType, VehicleStatus
from src.core.exceptions.base import ConflictError, NotFoundError, ValidationError
from src.data.clients.s3_client import s3_client
from src.data.repositories.job_repository import JobRepository
from src.data.repositories.vehicle_repository import VehicleRepository
from src.observability.logging.logger import get_logger
from src.schemas.vehicle import (
    ExpiringDocItem,
    UpdateVehicleRequest,
    VehicleAdminResponse,
    VehicleDetailResponse,
    VehicleListItem,
)

logger = get_logger(__name__)


class InventoryService:
    def __init__(self) -> None:
        self.vehicle_repo = VehicleRepository()

    async def get_available_vehicles(
        self,
        conn: Connection,
        branch_tag: str | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        vehicle_type: str | None = None,
        fuel_type: str | None = None,
        transmission: str | None = None,
    ) -> list[VehicleListItem]:
        vehicles = await self.vehicle_repo.get_available(
            conn, branch_tag, start_time, end_time, vehicle_type, fuel_type, transmission
        )
        return [
            VehicleListItem(
                **v,
                thumbnail_url=v["thumbnail_urls"][0] if v["thumbnail_urls"] else "",
            )
            for v in vehicles
        ]

    async def get_vehicle_detail(
        self, conn: Connection, vehicle_id: UUID
    ) -> VehicleDetailResponse:
        vehicle = await self.vehicle_repo.get_by_id(conn, vehicle_id)
        if not vehicle:
            raise NotFoundError("Vehicle")
        return VehicleDetailResponse(
            **vehicle,
            thumbnail_url=vehicle["thumbnail_urls"][0] if vehicle["thumbnail_urls"] else "",
        )

    async def create_vehicle(
        self,
        conn: Connection,
        brand: str,
        model: str,
        vehicle_type: str,
        transmission: str,
        fuel_type: str,
        branch_tag: str,
        hourly_rate: Decimal,
        daily_rate: Decimal,
        security_deposit: Decimal,
        fuel_level_pct: int,
        vehicle_images: list[UploadFile],
        insurance_doc: UploadFile,
        rc_doc: UploadFile,
        puc_doc: UploadFile,
    ) -> VehicleAdminResponse:

        # Validate image types
        if not vehicle_images:
            raise ValidationError("At least one vehicle image is required")
        for img in vehicle_images:
            if img.content_type not in ("image/jpeg", "image/png"):
                raise ValidationError(
                    f"Invalid image type for '{img.filename}'. Only JPG and PNG allowed."
                )

        # Validate document types
        for doc, label in [(insurance_doc, "Insurance"), (rc_doc, "RC"), (puc_doc, "PUC")]:
            if doc.content_type != "application/pdf":
                raise ValidationError(f"{label} document must be a PDF.")

        temp_id = str(uuid.uuid4())

        # Upload vehicle images
        thumbnail_urls: list[str] = []
        for i, img in enumerate(vehicle_images):
            img_bytes = await img.read()
            ext = "jpg" if img.content_type == "image/jpeg" else "png"
            key = f"vehicles/{temp_id}/images/img_{i}.{ext}"
            url = await s3_client.upload_file(img_bytes, key, img.content_type)
            thumbnail_urls.append(url)

        # Upload PDFs
        insurance_bytes = await insurance_doc.read()
        insurance_url = await s3_client.upload_file(
            insurance_bytes, f"vehicles/{temp_id}/docs/insurance.pdf", "application/pdf"
        )
        rc_bytes = await rc_doc.read()
        rc_url = await s3_client.upload_file(
            rc_bytes, f"vehicles/{temp_id}/docs/rc.pdf", "application/pdf"
        )
        puc_bytes = await puc_doc.read()
        puc_url = await s3_client.upload_file(
            puc_bytes, f"vehicles/{temp_id}/docs/puc.pdf", "application/pdf"
        )

        # Insert vehicle (expiry dates = None, AI fills them)
        vehicle_data = {
            "brand": brand,
            "model": model,
            "vehicle_type": vehicle_type,
            "transmission": transmission,
            "fuel_type": fuel_type,
            "branch_tag": branch_tag,
            "hourly_rate": hourly_rate,
            "daily_rate": daily_rate,
            "security_deposit": security_deposit,
            "fuel_level_pct": fuel_level_pct,
            "thumbnail_urls": thumbnail_urls,
            "insurance_url": insurance_url,
            "rc_url": rc_url,
            "puc_url": puc_url,
            "vehicle_status": VehicleStatus.available.value,
            "insurance_expiry_date": None,
            "rc_expiry_date": None,
            "puc_expiry_date": None,
        }

        new_vehicle = await self.vehicle_repo.create(conn, vehicle_data)
        vehicle_id = new_vehicle["vehicle_id"]

        # Enqueue AI doc extraction
        job = await JobRepository.create(
            conn,
            job_type=JobType.vehicle_doc_extraction.value,
            reference_id=vehicle_id,
            reference_type=ReferenceType.vehicle.value,
        )
        from src.workers.vehicle_doc_worker import run_vehicle_doc_extraction
        run_vehicle_doc_extraction.delay(job_id=str(job["job_id"]), vehicle_id=str(vehicle_id))

        logger.info(f"Vehicle {vehicle_id} created. Doc extraction job: {job['job_id']}")

        return VehicleAdminResponse(
            **new_vehicle,
            thumbnail_url=thumbnail_urls[0],
            doc_extraction_status="queued",
        )

    async def update_vehicle(
        self, conn: Connection, vehicle_id: UUID, data: UpdateVehicleRequest
    ) -> VehicleAdminResponse:
        exists = await self.vehicle_repo.get_by_id(conn, vehicle_id)
        if not exists:
            raise NotFoundError("Vehicle")
        updates = data.model_dump(exclude_none=True)
        if not updates:
            return VehicleAdminResponse(
                **exists,
                thumbnail_url=exists["thumbnail_urls"][0] if exists["thumbnail_urls"] else "",
            )
        updated = await self.vehicle_repo.update(conn, vehicle_id, updates)
        return VehicleAdminResponse(
            **updated,
            thumbnail_url=updated["thumbnail_urls"][0] if updated["thumbnail_urls"] else "",
        )

    async def update_vehicle_status(
        self, conn: Connection, vehicle_id: UUID, status: VehicleStatus
    ) -> VehicleAdminResponse:
        vehicle = await self.vehicle_repo.get_by_id(conn, vehicle_id)
        if not vehicle:
            raise NotFoundError("Vehicle")
        if status in (VehicleStatus.maintenance, VehicleStatus.retired):
            if await self.vehicle_repo.has_active_bookings(conn, vehicle_id):
                raise ConflictError("Cannot change status: active bookings exist")
        updated = await self.vehicle_repo.update_status(conn, vehicle_id, status.value)
        return VehicleAdminResponse(
            **updated,
            thumbnail_url=updated["thumbnail_urls"][0] if updated["thumbnail_urls"] else "",
        )

    async def delete_vehicle(self, conn: Connection, vehicle_id: UUID) -> None:
        if not await self.vehicle_repo.get_by_id(conn, vehicle_id):
            raise NotFoundError("Vehicle")
        if await self.vehicle_repo.has_active_bookings(conn, vehicle_id):
            raise ConflictError("Cannot delete: active bookings exist")
        await self.vehicle_repo.delete(conn, vehicle_id)

    async def get_expiring_docs(self, conn: Connection, days: int) -> list[ExpiringDocItem]:
        vehicles = await self.vehicle_repo.get_expiring_docs(conn, days)
        today = date.today()
        results = []
        for v in vehicles:
            expiring_list = []
            for doc_name, expiry_date in {
                "insurance": v.get("insurance_expiry_date"),
                "rc": v.get("rc_expiry_date"),
                "puc": v.get("puc_expiry_date"),
            }.items():
                if expiry_date is None:
                    continue
                days_left = (expiry_date - today).days
                if days_left <= days:
                    expiring_list.append({
                        "doc": doc_name,
                        "expiry_date": expiry_date.isoformat(),
                        "days_left": days_left,
                    })
            if expiring_list:
                results.append(ExpiringDocItem(
                    vehicle_id=v["vehicle_id"], brand=v["brand"],
                    model=v["model"], branch_tag=v["branch_tag"],
                    expiring=expiring_list,
                ))
        return results
PYEOF
echo "  [OK] services/inventory_service.py"

# 5. schemas/webhook.py
cat > src/schemas/webhook.py << 'PYEOF'
from datetime import date
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from src.constants.enums import JobStatus, KYCStatus, DamageClassification


class KYCResultWebhookRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    job_id: UUID
    user_id: UUID
    status: JobStatus
    kyc_decision: KYCStatus
    extracted_address: str | None = None
    dl_expiry_date: date | None = None
    face_match_score: float | None = None
    error: str | None = None


class DamageResultWebhookRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    job_id: UUID
    booking_id: UUID
    status: JobStatus
    classification: DamageClassification
    llm_reasoning: str | None = None
    error: str | None = None


class VehicleDocResultWebhookRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    job_id: UUID
    vehicle_id: UUID
    status: JobStatus
    insurance_expiry_date: date | None = None
    rc_expiry_date: date | None = None
    puc_expiry_date: date | None = None
    error: str | None = None


class WebhookAckResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    acknowledged: bool = True
PYEOF
echo "  [OK] schemas/webhook.py"

# 6. routes/webhooks.py
cat > src/api/rest/routes/webhooks.py << 'PYEOF'
from fastapi import APIRouter, Depends
import asyncpg

from src.api.rest.dependencies import get_db_connection, verify_internal_secret
from src.schemas.webhook import (
    KYCResultWebhookRequest,
    DamageResultWebhookRequest,
    VehicleDocResultWebhookRequest,
    WebhookAckResponse,
)
from src.core.services.webhook_service import WebhookService

webhooks_router = APIRouter()


@webhooks_router.post("/kyc-result", response_model=WebhookAckResponse)
async def process_kyc_webhook(
    data: KYCResultWebhookRequest,
    conn: asyncpg.Connection = Depends(get_db_connection),
    _: None = Depends(verify_internal_secret),
) -> WebhookAckResponse:
    await WebhookService.process_kyc_result(conn, data)
    return WebhookAckResponse(acknowledged=True)


@webhooks_router.post("/damage-result", response_model=WebhookAckResponse)
async def process_damage_webhook(
    data: DamageResultWebhookRequest,
    conn: asyncpg.Connection = Depends(get_db_connection),
    _: None = Depends(verify_internal_secret),
) -> WebhookAckResponse:
    await WebhookService.process_damage_result(conn, data)
    return WebhookAckResponse(acknowledged=True)


@webhooks_router.post("/vehicle-doc-result", response_model=WebhookAckResponse)
async def process_vehicle_doc_webhook(
    data: VehicleDocResultWebhookRequest,
    conn: asyncpg.Connection = Depends(get_db_connection),
    _: None = Depends(verify_internal_secret),
) -> WebhookAckResponse:
    await WebhookService.process_vehicle_doc_result(conn, data)
    return WebhookAckResponse(acknowledged=True)
PYEOF
echo "  [OK] routes/webhooks.py"

# 7. job_service.py
cat > src/core/services/job_service.py << 'PYEOF'
from uuid import UUID
from typing import Any

from src.constants.enums import JobStatus, JobType
from src.core.exceptions.base import ConflictError, NotFoundError
from src.data.repositories.job_repository import JobRepository
from src.observability.logging.logger import get_logger
from src.schemas.async_job import AsyncJobListResponse, AsyncJobResponse, RetryJobResponse

logger = get_logger(__name__)


class JobService:
    @staticmethod
    async def list_jobs(
        conn: Any,
        job_type: str | None,
        status: str | None,
        page: int,
        limit: int,
    ) -> AsyncJobListResponse:
        rows, total = await JobRepository.get_all_with_filters(
            conn=conn, job_type=job_type, status=status, page=page, limit=limit
        )
        return AsyncJobListResponse(
            jobs=[
                AsyncJobResponse(
                    job_id=row["job_id"],
                    job_type=row["job_type"],
                    reference_id=row["reference_id"],
                    reference_type=row["reference_type"],
                    status=row["status"],
                    retry_count=row["retry_count"],
                    last_error=row.get("last_error"),
                    celery_task_id=row.get("celery_task_id"),
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                    is_stuck=row.get("is_stuck", False),
                )
                for row in rows
            ],
            total=total,
            page=page,
            limit=limit,
        )

    @staticmethod
    async def retry_job(conn: Any, job_id: UUID, requested_by: UUID) -> RetryJobResponse:
        job = await JobRepository.get_by_id(conn, job_id)
        if not job:
            raise NotFoundError("Job")
        if job["status"] != JobStatus.failed.value:
            raise ConflictError("Only failed jobs can be retried")

        updated = await JobRepository.reset_for_retry(conn, job_id)
        job_type = job["job_type"]
        reference_id = str(job["reference_id"])
        reference_type = job["reference_type"]

        if job_type == JobType.kyc_verification.value:
            from src.workers.kyc_worker import run_kyc_verification
            run_kyc_verification.delay(job_id=str(job_id), user_id=reference_id)

        elif job_type == JobType.damage_assessment.value:
            from src.workers.damage_worker import run_damage_assessment
            run_damage_assessment.delay(job_id=str(job_id), booking_id=reference_id)

        elif job_type == JobType.email_notification.value:
            from src.workers.notification_worker import send_email_notification
            send_email_notification.delay(reference_id=reference_id, reference_type=reference_type)

        elif job_type == JobType.vehicle_doc_extraction.value:
            from src.workers.vehicle_doc_worker import run_vehicle_doc_extraction
            run_vehicle_doc_extraction.delay(job_id=str(job_id), vehicle_id=reference_id)

        logger.info(f"Job {job_id} (type={job_type}) re-enqueued by {requested_by}")

        return RetryJobResponse(
            job_id=job_id,
            status=JobStatus.queued,
            retry_count=updated["retry_count"],
            message="Job re-enqueued successfully",
        )
PYEOF
echo "  [OK] services/job_service.py"

# 8. Add update_doc_expiry_dates to vehicle_repository if not already there
if ! grep -q "update_doc_expiry_dates" src/data/repositories/vehicle_repository.py; then
cat >> src/data/repositories/vehicle_repository.py << 'PYEOF'

    async def update_doc_expiry_dates(
        self,
        conn,
        vehicle_id,
        insurance_expiry_date,
        rc_expiry_date,
        puc_expiry_date,
    ) -> None:
        await conn.execute(
            """
            UPDATE vehicles
            SET insurance_expiry_date = $1,
                rc_expiry_date = $2,
                puc_expiry_date = $3,
                updated_at = NOW()
            WHERE vehicle_id = $4
            """,
            insurance_expiry_date,
            rc_expiry_date,
            puc_expiry_date,
            vehicle_id,
        )
PYEOF
echo "  [OK] repositories/vehicle_repository.py — update_doc_expiry_dates added"
else
echo "  [SKIP] vehicle_repository.py — update_doc_expiry_dates already present"
fi

# 9. Add process_vehicle_doc_result to webhook_service if not already there
if ! grep -q "process_vehicle_doc_result" src/core/services/webhook_service.py; then
cat >> src/core/services/webhook_service.py << 'PYEOF'

    @staticmethod
    async def process_vehicle_doc_result(conn, data) -> None:
        from src.data.repositories.vehicle_repository import VehicleRepository
        if data.status.value == "failed":
            error_msg = data.error or "Doc extraction failed"
            await JobRepository.fail_job(conn, data.job_id, error_msg)
            logger.error(
                f"Vehicle doc job {data.job_id} failed for vehicle {data.vehicle_id}: {error_msg}"
            )
            return
        if data.status.value == "completed":
            await JobRepository.complete_job(conn, data.job_id)
            vehicle_repo = VehicleRepository()
            await vehicle_repo.update_doc_expiry_dates(
                conn, data.vehicle_id,
                data.insurance_expiry_date, data.rc_expiry_date, data.puc_expiry_date,
            )
            logger.info(
                f"Vehicle {data.vehicle_id} doc extraction complete — "
                f"insurance: {data.insurance_expiry_date}, "
                f"rc: {data.rc_expiry_date}, puc: {data.puc_expiry_date}"
            )
PYEOF
echo "  [OK] services/webhook_service.py — process_vehicle_doc_result added"
else
echo "  [SKIP] webhook_service.py — process_vehicle_doc_result already present"
fi

# 10. Create vehicle_doc_agent.py
mkdir -p src/control/agents
cat > src/control/agents/vehicle_doc_agent.py << 'PYEOF'
from __future__ import annotations

import asyncio
import io
from datetime import date
from typing import TypedDict

import asyncpg
import httpx
from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph

from src.config.settings import settings


class VehicleDocState(TypedDict):
    vehicle_id: str
    insurance_url: str | None
    rc_url: str | None
    puc_url: str | None
    insurance_expiry_date: str | None
    rc_expiry_date: str | None
    puc_expiry_date: str | None
    error: str | None
    success: bool


async def _extract_text_from_pdf_url(url: str) -> str:
    try:
        from pypdf import PdfReader
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(url)
            r.raise_for_status()
        reader = PdfReader(io.BytesIO(r.content))
        text = "".join(page.extract_text() or "" for page in reader.pages)
        return text.strip() or "No text could be extracted."
    except Exception as e:
        return f"PDF extraction error: {e}"


def _build_llm() -> ChatGroq:
    return ChatGroq(api_key=settings.groq_api_key, model="llama-3.3-70b-versatile", temperature=0.0)


async def _ask_llm_for_date(llm: ChatGroq, doc_label: str, text: str) -> str | None:
    prompt = (
        f"You are a document parser. Extract the {doc_label} expiry date from the text below.\n"
        f"Return ONLY the date in YYYY-MM-DD format. If not found, return NOT_FOUND.\n\n"
        f"Document text:\n{text[:3000]}\n\nExpiry date (YYYY-MM-DD only):"
    )
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    extracted = response.content.strip()
    if extracted == "NOT_FOUND" or len(extracted) != 10:
        return None
    date.fromisoformat(extracted)  # raises if invalid
    return extracted


async def fetch_documents(state: VehicleDocState) -> dict:
    try:
        dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        conn = await asyncpg.connect(dsn)
        try:
            row = await conn.fetchrow(
                "SELECT insurance_url, rc_url, puc_url FROM vehicles WHERE vehicle_id = $1",
                state["vehicle_id"],
            )
            if not row:
                return {"error": f"Vehicle {state['vehicle_id']} not found"}
            if not (row["insurance_url"] and row["rc_url"] and row["puc_url"]):
                return {"error": "One or more document URLs missing from vehicle record"}
            return {"insurance_url": row["insurance_url"], "rc_url": row["rc_url"], "puc_url": row["puc_url"]}
        finally:
            await conn.close()
    except Exception as e:
        return {"error": f"Database error: {e}"}


async def extract_insurance(state: VehicleDocState) -> dict:
    if state.get("error"):
        return {}
    try:
        text = await _extract_text_from_pdf_url(state["insurance_url"])
        result = await _ask_llm_for_date(_build_llm(), "insurance policy", text)
        return {"insurance_expiry_date": result}
    except Exception:
        return {"insurance_expiry_date": None}


async def extract_rc(state: VehicleDocState) -> dict:
    if state.get("error"):
        return {}
    try:
        text = await _extract_text_from_pdf_url(state["rc_url"])
        result = await _ask_llm_for_date(_build_llm(), "vehicle registration (RC)", text)
        return {"rc_expiry_date": result}
    except Exception:
        return {"rc_expiry_date": None}


async def extract_puc(state: VehicleDocState) -> dict:
    if state.get("error"):
        return {}
    try:
        text = await _extract_text_from_pdf_url(state["puc_url"])
        result = await _ask_llm_for_date(_build_llm(), "PUC (Pollution Under Control) certificate", text)
        return {"puc_expiry_date": result}
    except Exception:
        return {"puc_expiry_date": None}


async def validate_results(state: VehicleDocState) -> dict:
    if state.get("error"):
        return {"success": False}
    found = sum([
        state.get("insurance_expiry_date") is not None,
        state.get("rc_expiry_date") is not None,
        state.get("puc_expiry_date") is not None,
    ])
    if found == 0:
        return {"success": False, "error": "Could not extract any expiry dates from documents"}
    return {"success": True}


workflow = StateGraph(VehicleDocState)
workflow.add_node("fetch_documents", fetch_documents)
workflow.add_node("extract_insurance", extract_insurance)
workflow.add_node("extract_rc", extract_rc)
workflow.add_node("extract_puc", extract_puc)
workflow.add_node("validate_results", validate_results)
workflow.set_entry_point("fetch_documents")
workflow.add_edge("fetch_documents", "extract_insurance")
workflow.add_edge("extract_insurance", "extract_rc")
workflow.add_edge("extract_rc", "extract_puc")
workflow.add_edge("extract_puc", "validate_results")
workflow.add_edge("validate_results", END)
compiled_graph = workflow.compile()


def run_vehicle_doc_agent(vehicle_id: str) -> dict:
    initial_state = VehicleDocState(
        vehicle_id=vehicle_id,
        insurance_url=None, rc_url=None, puc_url=None,
        insurance_expiry_date=None, rc_expiry_date=None, puc_expiry_date=None,
        error=None, success=False,
    )
    return dict(asyncio.run(compiled_graph.ainvoke(initial_state)))
PYEOF
echo "  [OK] control/agents/vehicle_doc_agent.py"

# 11. Create vehicle_doc_worker.py
cat > src/workers/vehicle_doc_worker.py << 'PYEOF'
from __future__ import annotations

import httpx

from src.config.settings import settings
from src.control.agents.vehicle_doc_agent import run_vehicle_doc_agent
from src.workers.celery_app import celery_app


@celery_app.task(name="vehicle_doc_extraction", bind=True, max_retries=3, default_retry_delay=60)
def run_vehicle_doc_extraction(self, job_id: str, vehicle_id: str) -> dict:
    try:
        result = run_vehicle_doc_agent(vehicle_id=vehicle_id)
        payload = {
            "job_id": job_id,
            "vehicle_id": vehicle_id,
            "status": "completed" if result.get("success") else "failed",
            "insurance_expiry_date": result.get("insurance_expiry_date"),
            "rc_expiry_date": result.get("rc_expiry_date"),
            "puc_expiry_date": result.get("puc_expiry_date"),
            "error": None if result.get("success") else result.get("error", "Document extraction failed"),
        }
        response = httpx.post(
            "http://127.0.0.1:8000/internal/webhooks/vehicle-doc-result",
            json=payload,
            headers={"X-Internal-Secret": settings.internal_secret},
            timeout=30,
        )
        response.raise_for_status()
        return {"status": "done", "job_id": job_id, "vehicle_id": vehicle_id}
    except Exception as exc:
        raise self.retry(exc=exc)
PYEOF
echo "  [OK] workers/vehicle_doc_worker.py"

# 12. Add pypdf to pyproject.toml if missing
if ! grep -q "pypdf" pyproject.toml; then
    sed -i 's/"flower>=2.0.1"/"flower>=2.0.1",\n    "pypdf>=4.0.0"/' pyproject.toml
    echo "  [OK] pyproject.toml — pypdf added"
else
    echo "  [SKIP] pyproject.toml — pypdf already present"
fi

echo ""
echo "============================================"
echo " All files patched successfully!"
echo "============================================"
echo ""
echo "Now run:"
echo "  pip install pypdf"
echo "  uvicorn src.main:app --reload"
echo ""
echo "Then refresh Swagger — vehicle_images will show file pickers."