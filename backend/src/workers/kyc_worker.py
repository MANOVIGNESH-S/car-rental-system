import httpx
from src.workers.celery_app import celery_app
from src.config.settings import settings
from src.control.agents.kyc_agent import run_kyc_agent

@celery_app.task(
    name="kyc_verification",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def run_kyc_verification(self, job_id: str, user_id: str) -> dict:
    try:
        # 1. Call KYC agent to process documents
        result = run_kyc_agent(user_id=user_id)
        
        # 2. Build webhook payload based on result
        if result.get("success"):
            payload = {
                "job_id": job_id,
                "user_id": user_id,
                "status": "completed",
                "kyc_decision": result.get("kyc_decision"),
                "extracted_address": result.get("extracted_address"),
                "dl_expiry_date": result.get("dl_expiry_date"),
                "face_match_score": result.get("face_match_score"),
                "error": None,
            }
        else:
            payload = {
                "job_id": job_id,
                "user_id": user_id,
                "status": "failed",
                "kyc_decision": "failed",
                "error": result.get("error", "KYC processing failed"),
            }
            
        # 3. POST to webhook
        response = httpx.post(
            "http://localhost:8000/internal/webhooks/kyc-result",
            json=payload,
            headers={"X-Internal-Secret": settings.internal_secret},
            timeout=30.0,
        )
        response.raise_for_status()  # Ensure HTTP errors trigger a retry
        
    except Exception as exc:
        # 4. On failure, retry the task
        raise self.retry(exc=exc)
        
    return {"status": "completed", "job_id": job_id}