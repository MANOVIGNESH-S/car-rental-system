import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import asyncpg
import asyncio

from src.workers.celery_app import celery_app
from src.config.settings import settings

logger = logging.getLogger(__name__)


async def _fetch_recipient_email(reference_id: str, reference_type: str) -> str:
    dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    try:
        if reference_type == "user":
            row = await conn.fetchrow(
                "SELECT email FROM users WHERE user_id = $1", reference_id
            )
            return row["email"] if row else settings.smtp_from

        elif reference_type == "booking":
            row = await conn.fetchrow(
                """
                SELECT u.email FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                WHERE b.booking_id = $1
                """,
                reference_id,
            )
            return row["email"] if row else settings.smtp_from

        return settings.smtp_from
    finally:
        await conn.close()


@celery_app.task(
    name="email_notification",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def send_email_notification(self, reference_id: str, reference_type: str) -> dict:
    logger.info(f"Sending email notification for {reference_type}: {reference_id}")

    try:
        recipient = asyncio.run(
            _fetch_recipient_email(reference_id, reference_type)
        )
    except Exception as e:
        logger.error(f"Failed to fetch recipient email: {e}")
        recipient = settings.smtp_from

    subject = f"Car Rental System — Update on your {reference_type}"
    body = (
        f"Your {reference_type} (ID: {reference_id}) has been updated. "
        f"Log in to check the latest status."
    )

    msg = MIMEMultipart()
    msg["From"] = settings.smtp_from
    msg["To"] = recipient
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    # Email failure must never crash or retry — just log
    try:
        if not settings.smtp_host or settings.smtp_host == "smtp.gmail.com" and not settings.smtp_password:
            logger.info(
                f"[MOCK EMAIL] To: {recipient} | Subject: {subject} | Body: {body}"
            )
            return {"status": "mock_sent", "reference_id": reference_id, "to": recipient}

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
            logger.info(f"Email sent to {recipient} for {reference_type}: {reference_id}")

    except Exception as exc:
        logger.error(
            f"Email send failed for {reference_type} {reference_id} → {recipient}: {exc}"
        )

    return {"status": "sent", "reference_id": reference_id, "to": recipient}