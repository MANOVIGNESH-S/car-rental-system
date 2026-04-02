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
            # ✅ UNCHANGED
            row = await conn.fetchrow(
                "SELECT email FROM users WHERE user_id = $1", reference_id
            )
            return row["email"] if row else settings.smtp_from

        elif reference_type == "booking":
            # ✅ UNCHANGED
            row = await conn.fetchrow(
                """
                SELECT u.email FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                WHERE b.booking_id = $1
                """,
                reference_id,
            )
            return row["email"] if row else settings.smtp_from

        elif reference_type == "vehicle":
            # FIX 2+3: Vehicle notifications go to branch managers / ops team.
            # We send to smtp_from (admin inbox) since vehicles don't have a
            # direct user owner. This is the correct ops alerting pattern —
            # the admin mailbox receives the expiry alert and doc-ready notice.
            return settings.smtp_from

        # Unknown reference_type — safe fallback
        return settings.smtp_from
    finally:
        await conn.close()


def _build_email_content(
    reference_id: str,
    reference_type: str,
    extra: dict | None,
) -> tuple[str, str]:
    """
    Returns (subject, body) for any reference_type.
    KYC and damage paths are unchanged.
    Vehicle path uses extra context for a rich, actionable email.
    """
    if reference_type == "user":
        # ✅ UNCHANGED — KYC notification
        subject = "Car Rental System — KYC update"
        body = (
            f"Your KYC verification (ID: {reference_id}) has been updated. "
            f"Log in to check the latest status."
        )

    elif reference_type == "booking":
        if extra and extra.get("event") == "damage_resolved":
            resolution = extra.get("resolution", "clear")
            damage_amount = extra.get("damage_amount")
            refund_amount = extra.get("refund_amount", "0.00")
            subject = "Car Rental System — Damage claim resolved"
            if resolution == "clear":
                body = (
                    f"Good news! The damage claim for your booking (ID: {reference_id}) "
                    f"has been reviewed and cleared — no damage was found. "
                    f"Your full security deposit of \u20b9{refund_amount} will be refunded."
                )
            else:
                body = (
                    f"The damage claim for your booking (ID: {reference_id}) has been resolved. "
                    f"A damage charge of \u20b9{damage_amount} has been applied. "
                    f"The remaining balance of \u20b9{refund_amount} will be refunded to you."
                )
        else:
            subject = "Car Rental System — Booking update"
            body = (
                f"Your booking (ID: {reference_id}) has been updated. "
                f"Log in to check the latest status."
            )

    elif reference_type == "vehicle" and extra:
        # FIX 3: Build a rich, actionable alert instead of the generic template.
        # Two sub-cases:
        #   a) expiry_worker fires → extra has brand/model/expiry dates (expiry alert)
        #   b) webhook_service fires after extraction → extra is None (doc-ready notice)
        brand = extra.get("brand", "")
        model = extra.get("model", "")
        branch = extra.get("branch_tag", "")

        expiring_docs = []
        for label, key in [
            ("Insurance", "insurance_expiry_date"),
            ("RC (Tax Paid up to)", "rc_expiry_date"),
            ("PUC", "puc_expiry_date"),
        ]:
            val = extra.get(key)
            if val:
                expiring_docs.append(f"  • {label}: expires {val}")

        if expiring_docs:
            # Called from expiry_worker — alert about upcoming expiry
            subject = f"[ACTION REQUIRED] Vehicle document expiry — {brand} {model} ({branch})"
            body = (
                f"The following documents for {brand} {model} at branch '{branch}' "
                f"are expiring within 30 days:\n\n"
                + "\n".join(expiring_docs)
                + "\n\nPlease renew and re-upload them at the earliest."
            )
        else:
            # Called from webhook_service after doc extraction — confirmation notice
            subject = f"Vehicle documents extracted — {brand} {model}"
            body = (
                f"Document expiry dates for {brand} {model} (Vehicle ID: {reference_id}) "
                f"have been successfully extracted and saved."
            )

    else:
        # Fallback for vehicle reference_type without extra (doc-ready notice)
        subject = "Car Rental System — Vehicle document update"
        body = (
            f"Document expiry dates for vehicle {reference_id} have been "
            f"extracted and saved successfully."
        )

    return subject, body


async def _update_email_job_status(job_id: str, status: str, error: str | None = None) -> None:
    """Update the email notification job status in the DB after sending."""
    if not job_id:
        return
    try:
        dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        conn = await asyncpg.connect(dsn)
        try:
            if status == "completed":
                await conn.execute(
                    """
                    UPDATE async_jobs
                    SET status = 'completed', updated_at = NOW()
                    WHERE job_id = $1
                    """,
                    job_id,
                )
            else:
                await conn.execute(
                    """
                    UPDATE async_jobs
                    SET status = 'failed', last_error = $1, updated_at = NOW()
                    WHERE job_id = $2
                    """,
                    error,
                    job_id,
                )
        finally:
            await conn.close()
    except Exception as e:
        logger.error(f"Failed to update email job {job_id} status: {e}")


@celery_app.task(
    name="email_notification",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def send_email_notification(
    self,
    reference_id: str,
    reference_type: str,
    extra: dict | None = None,
    job_id: str | None = None,  # DB job ID — used to mark job completed/failed
) -> dict:
    logger.info(f"Sending email notification for {reference_type}: {reference_id}")

    try:
        recipient = asyncio.run(
            _fetch_recipient_email(reference_id, reference_type)
        )
    except Exception as e:
        logger.error(f"Failed to fetch recipient email: {e}")
        recipient = settings.smtp_from

    subject, body = _build_email_content(reference_id, reference_type, extra)

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
            # Mark job completed even in mock mode
            asyncio.run(_update_email_job_status(job_id, "completed"))
            return {"status": "mock_sent", "reference_id": reference_id, "to": recipient}

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
            logger.info(f"Email sent to {recipient} for {reference_type}: {reference_id}")
            asyncio.run(_update_email_job_status(job_id, "completed"))

    except Exception as exc:
        logger.error(
            f"Email send failed for {reference_type} {reference_id} → {recipient}: {exc}"
        )
        asyncio.run(_update_email_job_status(job_id, "failed", str(exc)))

    return {"status": "sent", "reference_id": reference_id, "to": recipient}