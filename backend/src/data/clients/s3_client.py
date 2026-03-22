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
        """Uploads raw bytes to S3 and returns the public URL."""
        try:
            self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_bytes,
                ContentType=content_type
            )
            return f"https://{self.bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"
        except ClientError as e:
            raise InternalServiceError(f"S3 Upload failed: {str(e)}")

    async def generate_presigned_url(self, key: str, expires_in: int = 900) -> str:
        """Generates a temporary URL for secure access to private assets."""
        try:
            return self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': key},
                ExpiresIn=expires_in
            )
        except ClientError as e:
            raise InternalServiceError(f"Presigned URL generation failed: {str(e)}")

s3_client = S3Client()