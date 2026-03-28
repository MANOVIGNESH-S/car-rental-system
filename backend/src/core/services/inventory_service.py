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
