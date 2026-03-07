"""
S3/MinIO Storage Service for photo uploads.

This module is designed to work with:
- MinIO (S3-compatible) at S3_ENDPOINT
- S3 URLs in either:
    1) s3://bucket/key
    2) raw object key (key only) -> assumed bucket = S3_BUCKET
- Fallback URLs:
    local://<hash>  (no signed url support)
"""
import os
import hashlib
import base64
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple

import boto3  # type: ignore
from botocore.client import Config  # type: ignore
from botocore.exceptions import ClientError  # type: ignore
from dotenv import load_dotenv  # type: ignore

load_dotenv()
logger = logging.getLogger(__name__)

# Storage configuration
S3_ENDPOINT = os.environ.get("S3_ENDPOINT", "http://localhost:9000")
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "minioadmin")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY", "minioadmin")
S3_BUCKET = os.environ.get("S3_BUCKET", "ireland-travel-photos")
S3_REGION = os.environ.get("S3_REGION", "us-east-1")

# Retention policy
PHOTO_RETENTION_DAYS = int(os.environ.get("PHOTO_RETENTION_DAYS", "365"))  # Default 1 year
SIGNED_URL_EXPIRY_HOURS = int(os.environ.get("SIGNED_URL_EXPIRY_HOURS", "72"))  # 3 days for emails


def _strip_data_url_prefix(photo_base64: str) -> str:
    """Remove 'data:*;base64,' prefix if present."""
    if photo_base64.startswith("data:"):
        parts = photo_base64.split(",", 1)
        if len(parts) == 2:
            return parts[1]
    return photo_base64


def _parse_storage_ref(photo_url_or_key: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Normalize a stored reference into (bucket, key).

    Accepts:
      - s3://bucket/key
      - key (assumes bucket = S3_BUCKET)
      - local://hash  -> returns (None, None)
      - empty/None-ish -> returns (None, None)
    """
    if not photo_url_or_key:
        return None, None

    if photo_url_or_key.startswith("local://"):
        return None, None

    if photo_url_or_key.startswith("s3://"):
        ref = photo_url_or_key[len("s3://") :]
        parts = ref.split("/", 1)
        bucket = parts[0] if parts and parts[0] else None
        key = parts[1] if len(parts) > 1 else None
        if not bucket or not key:
            return None, None
        return bucket, key

    # Otherwise assume it's a raw object key in S3_BUCKET
    return S3_BUCKET, photo_url_or_key


class StorageService:
    """Handles S3/MinIO storage operations."""

    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self) -> None:
        """Initialize S3 client."""
        try:
            self.client = boto3.client(
                "s3",
                endpoint_url=S3_ENDPOINT,
                aws_access_key_id=S3_ACCESS_KEY,
                aws_secret_access_key=S3_SECRET_KEY,
                config=Config(signature_version="s3v4"),
                region_name=S3_REGION,
            )

            # Ensure bucket exists
            try:
                self.client.head_bucket(Bucket=S3_BUCKET)
            except ClientError:
                # Create bucket (MinIO typically ignores region constraints)
                self.client.create_bucket(Bucket=S3_BUCKET)
                logger.info(f"Created bucket: {S3_BUCKET}")

        except Exception as e:
            logger.warning(f"S3 client initialization failed: {e}. Using fallback mode.")
            self.client = None

    def is_available(self) -> bool:
        return self.client is not None

    def upload_photo(self, photo_base64: str, user_id: str, stop_id: str) -> Tuple[str, str]:
        """
        Upload a photo to S3/MinIO.

        Returns:
            (photo_ref, photo_hash)

        photo_ref:
            - If upload ok: object key (NOT s3://...) to stay compatible with your server.py pattern.
            - If upload fails/unavailable: local://<hash>
        """
        # Decode base64 safely
        b64 = _strip_data_url_prefix(photo_base64)

        try:
            photo_bytes = base64.b64decode(b64, validate=True)
        except Exception as e:
            # If frontend sends non-validated base64, try without validate
            try:
                photo_bytes = base64.b64decode(b64)
            except Exception:
                logger.error(f"Base64 decode failed: {e}")
                # Still return deterministic hash from input string for dedupe
                fallback_hash = hashlib.sha256(b64.encode("utf-8", errors="ignore")).hexdigest()
                return f"local://{fallback_hash}", fallback_hash

        photo_hash = hashlib.sha256(photo_bytes).hexdigest()

        timestamp_path = datetime.utcnow().strftime("%Y/%m/%d")
        object_key = f"{user_id}/{timestamp_path}/{stop_id}_{photo_hash[:16]}.jpg"

        if self.client:
            try:
                self.client.put_object(
                    Bucket=S3_BUCKET,
                    Key=object_key,
                    Body=photo_bytes,
                    ContentType="image/jpeg",
                    Metadata={
                        "user_id": user_id,
                        "stop_id": stop_id,
                        "uploaded_at": datetime.utcnow().isoformat(),
                        "retention_until": (datetime.utcnow() + timedelta(days=PHOTO_RETENTION_DAYS)).isoformat(),
                    },
                )
                logger.info(f"Uploaded photo: {object_key}")
                # Return key only (works with your server.py and easy to presign)
                return object_key, photo_hash
            except Exception as e:
                logger.error(f"S3 upload failed: {e}")

        return f"local://{photo_hash}", photo_hash

    def get_signed_url(self, photo_url_or_key: str, expiry_hours: int = SIGNED_URL_EXPIRY_HOURS) -> Optional[str]:
        """
        Generate a time-limited signed URL for a photo.

        Accepts:
          - s3://bucket/key
          - raw key (assumes bucket = S3_BUCKET)
          - local://hash -> None
        """
        if not self.client:
            return None

        bucket, key = _parse_storage_ref(photo_url_or_key)
        if not bucket or not key:
            return None

        try:
            return self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=int(expiry_hours * 3600),
            )
        except Exception as e:
            logger.error(f"Failed to generate signed URL: {e}")
            return None

    def delete_photo(self, photo_url_or_key: str) -> bool:
        """
        Delete a photo from storage.

        Accepts:
          - s3://bucket/key
          - raw key (assumes bucket = S3_BUCKET)
          - local://hash -> False
        """
        if not self.client:
            return False

        bucket, key = _parse_storage_ref(photo_url_or_key)
        if not bucket or not key:
            return False

        try:
            self.client.delete_object(Bucket=bucket, Key=key)
            logger.info(f"Deleted photo: bucket={bucket}, key={key}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete photo: {e}")
            return False

    def delete_user_photos(self, user_id: str) -> int:
        """
        Delete all photos for a user (GDPR compliance).

        Returns:
            number of objects deleted
        """
        if not self.client:
            return 0

        deleted_count = 0
        try:
            paginator = self.client.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=f"{user_id}/"):
                for obj in page.get("Contents", []):
                    key = obj.get("Key")
                    if not key:
                        continue
                    self.client.delete_object(Bucket=S3_BUCKET, Key=key)
                    deleted_count += 1
            logger.info(f"Deleted {deleted_count} photos for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to delete user photos: {e}")

        return deleted_count


# Global instance
storage_service = StorageService()


# Retention Policy Documentation
"""
PHOTO RETENTION & DELETION POLICY
=================================

1. DEFAULT RETENTION:
   - Photos are retained for 365 days (configurable via PHOTO_RETENTION_DAYS env var)
   - Metadata includes 'retention_until' timestamp

2. USER DELETE ENDPOINT BEHAVIOR:
   - When a user requests account deletion:
     a) All their photos are immediately deleted from S3/MinIO
     b) Photo URLs in stops/damage_reports are set to null
     c) Photo hashes are retained for fraud prevention (anonymized)

3. SIGNED URL POLICY:
   - Default expiry: 72 hours (for authority emails)
   - URLs are generated on-demand, not stored
"""
