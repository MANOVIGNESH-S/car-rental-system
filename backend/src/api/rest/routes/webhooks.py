from fastapi import APIRouter, Depends
import asyncpg

from src.api.rest.dependencies import get_db_connection, verify_internal_secret
from src.schemas.webhook import (
    KYCResultWebhookRequest,
    DamageResultWebhookRequest,
    WebhookAckResponse,
)
from src.core.services.webhook_service import WebhookService

webhooks_router = APIRouter()


@webhooks_router.post(
    "/kyc-result",
    response_model=WebhookAckResponse,
)
async def process_kyc_webhook(
    data: KYCResultWebhookRequest,
    conn: asyncpg.Connection = Depends(get_db_connection),
    _: None = Depends(verify_internal_secret),
) -> WebhookAckResponse:
    await WebhookService.process_kyc_result(conn, data)
    return WebhookAckResponse(acknowledged=True)


@webhooks_router.post(
    "/damage-result",
    response_model=WebhookAckResponse,
)
async def process_damage_webhook(
    data: DamageResultWebhookRequest,
    conn: asyncpg.Connection = Depends(get_db_connection),
    _: None = Depends(verify_internal_secret),
) -> WebhookAckResponse:
    await WebhookService.process_damage_result(conn, data)
    return WebhookAckResponse(acknowledged=True)