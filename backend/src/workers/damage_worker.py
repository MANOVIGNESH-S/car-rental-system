import httpx
from src.workers.celery_app import celery_app
from src.config.settings import settings
from src.control.agents.damage_agent import run_damage_agent

@celery_app.task(
    name="damage_assessment",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
)
def run_damage_assessment(self, job_id: str, booking_id: str) -> dict:
    try:
        # 1. Call damage agent
        result = run_damage_agent(booking_id=booking_id)
        
        # 2. Build webhook payload
        if result.get("success"):
            payload = {
                "job_id": job_id,
                "booking_id": booking_id,
                "status": "completed",
                "classification": result.get("classification"),
                "llm_reasoning": result.get("reasoning"),
                "error": None,
            }
        else:
            payload = {
                "job_id": job_id,
                "booking_id": booking_id,
                "status": "failed",
                "classification": "needs_review",
                "error": result.get("error", "Damage assessment failed"),
            }
            
        # 3. POST to webhook
        response = httpx.post(
            "http://localhost:8000/internal/webhooks/damage-result",
            json=payload,
            headers={"X-Internal-Secret": settings.internal_secret},
            timeout=60.0, # 60 seconds because Vision LLM takes longer
        )
        response.raise_for_status()
        
    except Exception as exc:
        # 4. Retry on failure
        raise self.retry(exc=exc)
        
    return {"status": "completed", "job_id": job_id}