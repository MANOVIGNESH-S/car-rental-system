import base64
import boto3
from botocore.exceptions import ClientError
from src.config.settings import settings
from src.core.exceptions.base import InternalServiceError


class S3Client:
    def __init__(self):
        self.s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )
        self.bucket = settings.s3_bucket_name

    async def upload_file(self, file_bytes: bytes, key: str, content_type: str) -> str:
        """
        Uploads raw bytes to S3 and returns the plain (private) S3 URL.
        The URL is stored in DB as-is. Never returned directly to clients —
        always convert via presign() before including in API responses.
        """
        try:
            self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )
            return f"https://{self.bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"
        except ClientError as e:
            raise InternalServiceError(f"S3 Upload failed: {str(e)}")

    def download_bytes(self, key: str) -> bytes:
        """Downloads a file from S3 using AWS credentials and returns raw bytes."""
        try:
            response = self.s3.get_object(Bucket=self.bucket, Key=key)
            return response["Body"].read()
        except ClientError as e:
            raise InternalServiceError(f"S3 Download failed: {str(e)}")

    def url_to_key(self, url: str) -> str:
        """Extracts the S3 object key from a stored plain S3 URL."""
        # URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}
        parts = url.split(".amazonaws.com/", 1)
        return parts[1] if len(parts) == 2 else url

    def download_as_base64(self, url: str) -> str | None:
        """Downloads a private S3 file and returns it as a base64 data URL."""
        try:
            key = self.url_to_key(url)
            raw = self.download_bytes(key)
            ext = key.rsplit(".", 1)[-1].lower()
            mime = "image/png" if ext == "png" else "image/jpeg"
            b64 = base64.b64encode(raw).decode("utf-8")
            return f"data:{mime};base64,{b64}"
        except Exception:
            return None

    def presign(self, url: str, expires_in: int = 3600) -> str:
        """
        Convert a stored plain S3 URL into a time-limited presigned URL
        that any HTTP client (browser, mobile app) can load without AWS credentials.

        Call this at read time — never at write time.
        Default expiry: 1 hour (3600s). Use a shorter window for sensitive docs.

        Degrades gracefully: returns the original URL if presigning fails,
        so the app keeps working even if there's a transient AWS issue.
        """
        try:
            key = self.url_to_key(url)
            return self.s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except Exception:
            return url  # safe fallback — original URL, will 403 but won't crash

    # Kept for any existing callers that already use this method.
    # FIX: was incorrectly marked async — boto3 generate_presigned_url is
    # fully synchronous. Marking it async caused it to return a coroutine
    # object instead of a string in any caller that forgot to await it.
    def generate_presigned_url(self, key: str, expires_in: int = 900) -> str:
        """Generates a presigned URL from a raw S3 key (not a full URL)."""
        try:
            return self.s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except ClientError as e:
            raise InternalServiceError(f"Presigned URL generation failed: {str(e)}")


s3_client = S3Client()