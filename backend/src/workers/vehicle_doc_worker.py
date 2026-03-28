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
            f"{settings.internal_webhook_base_url}/internal/webhooks/vehicle-doc-result",
            json=payload,
            headers={"X-Internal-Secret": settings.internal_secret},
            timeout=30,
        )
        response.raise_for_status()
        return {"status": "done", "job_id": job_id, "vehicle_id": vehicle_id}
    except Exception as exc:
        raise self.retry(exc=exc)
