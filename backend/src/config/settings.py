from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str
    log_level: str
    secret_key: str
    internal_secret: str

    database_url: str

    redis_url: str
    celery_broker_url: str
    celery_result_backend: str

    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str
    s3_bucket_name: str

    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    frontend_url: str

    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    smtp_from: str

    groq_api_key: str

    internal_webhook_base_url: str = "http://127.0.0.1:8000"


    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"  
    )

    @property
    def sync_database_url(self) -> str:
        return self.database_url.replace("postgresql+asyncpg", "postgresql+psycopg2")



@lru_cache
def get_settings() -> Settings:
    """
    Creates a cached instance of the settings.
    Using lru_cache ensures we don't re-read the .env file multiple times.
    """
    return Settings()


settings = get_settings()