from celery import Celery
from celery.schedules import crontab
from src.config.settings import settings

celery_app = Celery(
    "car_rental",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "src.workers.kyc_worker",
        "src.workers.damage_worker",
        "src.workers.notification_worker",
        "src.workers.expiry_worker", 
        "src.workers.vehicle_doc_worker",

    ]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Added Celery Beat schedule for cron jobs
celery_app.conf.beat_schedule = {
    "check-expiring-docs-daily": {
        "task": "check_expiring_documents",
        "schedule": crontab(hour=9, minute=0),
    },
}