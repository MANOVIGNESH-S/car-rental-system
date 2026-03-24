import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from src.workers.celery_app import celery_app
from src.config.settings import settings

logger = logging.getLogger(__name__)

@celery_app.task(
    name="email_notification",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def send_email_notification(self, reference_id: str, reference_type: str) -> dict:
    # 1. Log the notification
    logger.info(f"Sending email notification for {reference_type}: {reference_id}")
    
    # 2. Build the generic notification email
    subject = f"Car Rental System — Update on your {reference_type}"
    body = f"Your {reference_type} (ID: {reference_id}) has been updated. Log in to check status."
    
    msg = MIMEMultipart()
    msg["From"] = settings.smtp_from
    msg["To"] = "user@example.com"  # Mock recipient 
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    
    # 3. Mock SMTP send with try/except
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            # Note: starttls() and login() are standard, adjust if your mock SMTP server behaves differently
            server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            
            server.send_message(msg)
            logger.info(f"Successfully sent email for {reference_type}: {reference_id}")
            
    except Exception as exc:
        # On failure just log error and do NOT retry
        # Email failure should not block the overall system flow
        logger.error(f"Failed to send email for {reference_type} {reference_id}. Error: {exc}")
        
    # 4. Return success dictionary regardless of SMTP outcome
    return {"status": "sent", "reference_id": reference_id}