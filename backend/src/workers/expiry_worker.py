import asyncio
import logging
import asyncpg
from typing import List

from src.workers.celery_app import celery_app
from src.config.settings import settings

logger = logging.getLogger(__name__)


async def _fetch_expiring_documents() -> List[asyncpg.Record]:
    """Async helper to connect to the DB and fetch expiring vehicle records."""
    dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")

    conn = await asyncpg.connect(dsn)
    try:
        query = """
            SELECT vehicle_id, brand, model, branch_tag,
                   insurance_expiry_date, rc_expiry_date, puc_expiry_date
            FROM vehicles
            WHERE insurance_expiry_date <= NOW() + interval '30 days'
               OR rc_expiry_date <= NOW() + interval '30 days'
               OR puc_expiry_date <= NOW() + interval '30 days'
        """
        records = await conn.fetch(query)
        return records
    finally:
        await conn.close()


@celery_app.task(name="check_expiring_documents")
def check_expiring_documents() -> None:
    """
    Cron task executed by Celery Beat to monitor expiring vehicle documents.
    """
    logger.info("Starting check for expiring vehicle documents...")

    try:
        records = asyncio.run(_fetch_expiring_documents())

        if not records:
            logger.info("No vehicles found with documents expiring within 30 days.")
            return

        for r in records:
            logger.warning(
                f"Vehicle {r['vehicle_id']} ({r['brand']} {r['model']}) at branch '{r['branch_tag']}' "
                f"has expiring docs - Insurance: {r['insurance_expiry_date']}, "
                f"RC: {r['rc_expiry_date']}, PUC: {r['puc_expiry_date']}"
            )

            from src.workers.notification_worker import send_email_notification
            send_email_notification.delay(
                reference_id=str(r['vehicle_id']),
                reference_type="vehicle_documents",
            )

    except Exception as e:
        logger.error(f"Failed to check expiring documents. Error: {e}")
        raise