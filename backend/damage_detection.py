"""
Damage Detection System with pluggable classifier interface.

Bu dosya:
- "models", "storage", "email_service" yoksa import-time'da patlamaz (runtime'da ilgili fonksiyon çağrılırsa uyarır).
- DB insert/update alanlarında enum -> .value dönüşümünü güvenli yapar.
- Email gönderme sync/async farkını otomatik handle eder.
"""

import sys
import os

# Fix module resolution
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

import asyncio
import logging
import inspect
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# =========================
# Optional local imports
# =========================
MODELS_OK = False
STORAGE_OK = False
EMAIL_OK = False

try:
    from .models import (  # type: ignore
        DamageType,
        DamageReportStatus,
        DamageReport,
        AuthorityType,
        Location,
    )
    MODELS_OK = True
except ImportError:
    try:
        from models import (  # type: ignore
            DamageType,
            DamageReportStatus,
            DamageReport,
            AuthorityType,
            Location,
        )
        MODELS_OK = True
    except Exception as e:
        logger.warning(f"[damage_detection] models import failed: {e}")

try:
    from .storage import storage_service  # type: ignore
    STORAGE_OK = True
except ImportError:
    try:
        from storage import storage_service  # type: ignore
        STORAGE_OK = True
    except Exception as e:
        storage_service = None  # type: ignore
        logger.warning(f"[damage_detection] storage import failed: {e}")

try:
    from .email_service import email_service  # type: ignore
    EMAIL_OK = True
except ImportError:
    try:
        from email_service import email_service  # type: ignore
        EMAIL_OK = True
    except Exception as e:
        email_service = None  # type: ignore
        logger.warning(f"[damage_detection] email_service import failed: {e}")

# =========================
# Configuration
# =========================
DAMAGE_CONFIDENCE_THRESHOLD = float(os.environ.get("DAMAGE_CONFIDENCE_THRESHOLD", "0.7"))


def _enum_value(x: Any) -> Any:
    """Enum ise .value, değilse kendisi."""
    return getattr(x, "value", x)


def _require_models():
    if not MODELS_OK:
        raise RuntimeError("models import edilemedi. models.py içindeki DamageType/DamageReportStatus/DamageReport/AuthorityType/Location gerekli.")


async def _maybe_await(func_or_value: Any) -> Any:
    """sync/async dönüşleri tekleştirir."""
    if inspect.isawaitable(func_or_value):
        return await func_or_value
    return func_or_value


# =========================
# Core result structure
# =========================
@dataclass
class DamageDetectionResult:
    """Result from damage detection model."""
    damage_type: "DamageType"  # type: ignore[name-defined]
    score: float  # 0-1 severity score
    confidence: float  # 0-1 model confidence
    model_version: str
    raw_output: Optional[Dict[str, Any]] = None


class DamageClassifierInterface(ABC):
    """Abstract interface for damage classification models."""

    @abstractmethod
    async def classify(self, image_data: bytes) -> DamageDetectionResult:
        """Classify an image for potential heritage damage."""
        raise NotImplementedError

    @property
    @abstractmethod
    def model_version(self) -> str:
        raise NotImplementedError


class StubDamageClassifier(DamageClassifierInterface):
    """
    Stub classifier: düşük confidence ve 'NONE' döner.
    """

    MODEL_VERSION = "stub-v1.0"

    async def classify(self, image_data: bytes) -> DamageDetectionResult:
        _require_models()
        await asyncio.sleep(0.05)

        # DamageType.NONE yoksa fallback: "unknown"/benzeri bir enum kullanılamaz.
        # Bu yüzden kesin olarak var olduğunu varsayıyoruz (MODELS sözleşmesi).
        return DamageDetectionResult(
            damage_type=DamageType.NONE,  # type: ignore[name-defined]
            score=0.0,
            confidence=0.1,
            model_version=self.MODEL_VERSION,
            raw_output={"stub": True, "message": "Stub classifier - replace with real model for production"},
        )

    @property
    def model_version(self) -> str:
        return self.MODEL_VERSION


class MockHighConfidenceClassifier(DamageClassifierInterface):
    """Test için yüksek confidence döndüren mock classifier."""

    MODEL_VERSION = "mock-high-confidence-v1.0"

    def __init__(self, damage_type=None, score: float = 0.8, confidence: float = 0.85):
        _require_models()
        self.damage_type = damage_type or DamageType.VANDALISM  # type: ignore[name-defined]
        self.score = score
        self.confidence = confidence

    async def classify(self, image_data: bytes) -> DamageDetectionResult:
        await asyncio.sleep(0.02)
        return DamageDetectionResult(
            damage_type=self.damage_type,
            score=float(self.score),
            confidence=float(self.confidence),
            model_version=self.MODEL_VERSION,
            raw_output={"mock": True, "test_mode": True},
        )

    @property
    def model_version(self) -> str:
        return self.MODEL_VERSION


# Global classifier instance
damage_classifier: DamageClassifierInterface = StubDamageClassifier()


def set_damage_classifier(classifier: DamageClassifierInterface):
    """Swap the global damage classifier."""
    global damage_classifier
    damage_classifier = classifier


# =========================
# Worker
# =========================
class DamageDetectionWorker:
    """
    Processes damage detection jobs.

    db expectation:
      - db.damage_reports.insert_one(dict)
      - db.damage_reports.update_one(filter, update)
      - db.damage_reports.find_one(filter)
    """

    def __init__(self, db):
        _require_models()
        self.db = db
        self.classifier = damage_classifier

    async def process_photo(
        self,
        user_id: str,
        trip_id: str,
        stop_id: str,
        poi_id: str,
        photo_url: str,
        photo_hash: str,
        poi_name: Optional[str] = None,
        poi_location: Optional["Location"] = None,  # type: ignore[name-defined]
        authority_type: "AuthorityType" = None,  # type: ignore[name-defined]
        authority_email: Optional[str] = None,
    ) -> Optional["DamageReport"]:  # type: ignore[name-defined]
        """
        Photo'yu indirip sınıflandırır; threshold üstü ve damage varsa report oluşturur.
        """
        _require_models()

        if authority_type is None:
            authority_type = AuthorityType.UNKNOWN  # type: ignore[name-defined]

        try:
            logger.info(f"Damage detection start: stop_id={stop_id}, photo_hash={str(photo_hash)[:16]}")

            # TODO: Gerçekte photo_url'den indir.
            image_data = b""

            result = await self.classifier.classify(image_data)

            logger.info(
                f"Damage detection result: type={_enum_value(result.damage_type)}, "
                f"score={result.score:.2f}, confidence={result.confidence:.2f}, model={result.model_version}"
            )

            # Threshold
            if float(result.confidence) < float(DAMAGE_CONFIDENCE_THRESHOLD):
                logger.info(
                    f"Confidence {result.confidence:.2f} below threshold {DAMAGE_CONFIDENCE_THRESHOLD:.2f}; no report."
                )
                return None

            # NONE -> skip
            if result.damage_type == DamageType.NONE:  # type: ignore[name-defined]
                logger.info("DamageType.NONE -> no report.")
                return None

            # Status
            if authority_email:
                status = DamageReportStatus.PENDING  # type: ignore[name-defined]
            else:
                status = DamageReportStatus.REVIEW_REQUIRED  # type: ignore[name-defined]
                logger.warning(f"Authority email missing for poi_id={poi_id}; status=REVIEW_REQUIRED")

            report = DamageReport(  # type: ignore[name-defined]
                user_id=user_id,
                trip_id=trip_id,
                stop_id=stop_id,
                poi_id=poi_id,
                photo_url=photo_url,
                photo_hash=photo_hash,
                damage_type=result.damage_type,
                score=float(result.score),
                confidence=float(result.confidence),
                model_version=result.model_version,
                status=status,
                authority_target=authority_type,
                authority_email=authority_email,
                poi_name=poi_name,
                poi_location=poi_location,
            )

            # DB write (enum değerleri pydantic dict'te zaten serialize edilebilir ama garanti için normalize edelim)
            doc = report.dict()
            # Bazı modeller enum'u object olarak bırakabiliyor -> stringe çek
            if "status" in doc:
                doc["status"] = _enum_value(doc["status"])
            if "damage_type" in doc:
                doc["damage_type"] = _enum_value(doc["damage_type"])
            if "authority_target" in doc:
                doc["authority_target"] = _enum_value(doc["authority_target"])

            await self.db.damage_reports.insert_one(doc)
            logger.info(f"Damage report created: id={getattr(report, 'id', None)}")

            # Email send
            if authority_email and status == DamageReportStatus.PENDING:  # type: ignore[name-defined]
                await self._send_report_email(report)

            return report

        except Exception as e:
            logger.error(f"Damage detection failed: {e}")
            return None

    async def _send_report_email(self, report: "DamageReport") -> bool:  # type: ignore[name-defined]
        """Send damage report email to authority."""
        _require_models()

        if not getattr(report, "authority_email", None):
            return False

        if not STORAGE_OK or storage_service is None:
            logger.error("storage_service not available; cannot sign photo url.")
            return False
        if not EMAIL_OK or email_service is None:
            logger.error("email_service not available; cannot send email.")
            return False

        try:
            # signed url (sync/async olabilir)
            signed_url = await _maybe_await(storage_service.get_signed_url(report.photo_url))

            # send email (sync/async olabilir)
            send_call = email_service.send_damage_report_email(
                report=report,
                signed_photo_url=signed_url,
                recipient_email=report.authority_email,
            )
            success = bool(await _maybe_await(send_call))

            if success:
                await self.db.damage_reports.update_one(
                    {"id": report.id},
                    {
                        "$set": {
                            "status": DamageReportStatus.SENT.value,  # type: ignore[name-defined]
                            "sent_at": datetime.utcnow(),
                        }
                    },
                )
                logger.info(f"Damage report email sent: id={report.id}")
            else:
                await self.db.damage_reports.update_one(
                    {"id": report.id},
                    {"$set": {"status": DamageReportStatus.FAILED.value}},  # type: ignore[name-defined]
                )
                logger.error(f"Damage report email send failed: id={report.id}")

            return success

        except Exception as e:
            logger.error(f"Error sending report email: {e}")
            try:
                await self.db.damage_reports.update_one(
                    {"id": report.id},
                    {"$set": {"status": DamageReportStatus.FAILED.value}},  # type: ignore[name-defined]
                )
            except Exception:
                pass
            return False

    async def retry_send_email(self, report_id: str) -> bool:
        """Retry sending email for an existing report."""
        _require_models()

        report_doc = await self.db.damage_reports.find_one({"id": report_id})
        if not report_doc:
            logger.error(f"Report not found: {report_id}")
            return False

        report = DamageReport(**report_doc)  # type: ignore[name-defined]

        if not getattr(report, "authority_email", None):
            logger.error(f"Report has no authority email: {report_id}")
            return False

        return await self._send_report_email(report)


# =========================
# Simple async queue
# =========================
class DamageDetectionQueue:
    """Simple async queue for damage detection jobs."""

    def __init__(self, db):
        _require_models()
        self.db = db
        self.worker = DamageDetectionWorker(db)
        self._tasks: List[asyncio.Task] = []

    async def enqueue(self, **kwargs):
        task = asyncio.create_task(self.worker.process_photo(**kwargs))
        self._tasks.append(task)

        # cleanup
        self._tasks = [t for t in self._tasks if not t.done()]

        logger.info(f"Enqueued damage detection job for stop_id={kwargs.get('stop_id')}")


def create_damage_detection_queue(db):
    _require_models()
    return DamageDetectionQueue(db)
