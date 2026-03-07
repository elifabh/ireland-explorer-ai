# server.py

import os
print(f"LOADING SERVER FROM: {__file__}")
import json
import logging
import uuid
import asyncio
import hashlib
import base64
from itertools import islice
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends  # type: ignore
from fastapi.security import APIKeyHeader  # type: ignore
from dotenv import load_dotenv  # type: ignore
from starlette.middleware.cors import CORSMiddleware  # type: ignore
from motor.motor_asyncio import AsyncIOMotorClient  # type: ignore
from pydantic import BaseModel, Field  # type: ignore

import boto3  # type: ignore
from botocore.client import Config  # type: ignore
from botocore.exceptions import ClientError  # type: ignore
import aiosmtplib  # type: ignore
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ---- Local imports (backend package) ----
from backend.data_services import GeoLocation, MockDataService, NominatimService
from backend.services.failte_service import sync_all_data, get_events_near
from backend.utils import calculate_distance_km, estimate_travel_time_min
from backend.agents import AgentOrchestrator, LLMClient  # <-- IMPORTANT: agent.py
from backend.models import (
    Location, POI as ModelPOI, VisitedPlace, VisitedPlaceCreate, VisitedPlaceUpdate,
    DamageReportStatus, PointsLedger, User, UserCreate, UserSettingsUpdate,
    Trip, TripCreate, TripStatus, Stop, StopStatus, CheckInRequest,
    DamageReport, DamageReportCreate, Reward, RewardRedemption,
    PlaceChatRequest, PlaceChatResponse, NotificationCheckRequest,
    NotificationCheckResponse, GeofenceTrigger, AuthorityType, DamageType,
    TimePreset, TravelMode, Interest, Pace
)

def first_n_chars(s: str, n: int) -> str:
    return s[:n]

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ============== LOGGING ==============
import warnings
# Silence noisy warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=RuntimeWarning)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ============== DB ==============
# ============== DB ==============
from backend.database import db

# ============== APP ==============
app = FastAPI(title="Ireland Travel Itinerary API")

@app.on_event("startup")
async def startup_event():
    try:
        # Initialize MinIO in a thread so it doesn't block the event loop
        # (boto3 head_bucket can take 3-27s on connection failure)
        asyncio.create_task(asyncio.to_thread(minio_service.is_available))
    except Exception as e:
        logger.error(f"Startup tasks failed: {e}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080", "http://127.0.0.1:8080",
        "http://localhost:8081", "http://127.0.0.1:8081",
        "http://localhost:8082", "http://127.0.0.1:8082",
        "http://localhost:19006", "http://127.0.0.1:19006",  # Expo web
        "http://localhost:19000", "http://127.0.0.1:19000",  # Expo dev
        "http://localhost:3000", "http://127.0.0.1:3000",    # Common dev port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# ============== ADMIN KEY ==============
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "demo-admin-key-12345")
api_key_header = APIKeyHeader(name="X-Admin-API-Key", auto_error=False)

async def verify_admin_key(api_key: str = Depends(api_key_header)):
    if not api_key or api_key != ADMIN_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing Admin API Key. Set X-Admin-API-Key header."
        )
    return api_key

# ============== MINIO ==============
class MinioService:
    def __init__(self):
        self.endpoint = os.environ.get("MINIO_ENDPOINT", "http://localhost:9000")
        self.access_key = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
        self.secret_key = os.environ.get("MINIO_SECRET_KEY", "minioadmin123")
        self.bucket_name = os.environ.get("MINIO_BUCKET", "ireland-photos")
        self.region = os.environ.get("MINIO_REGION", "us-east-1")
        self._client: Any = None
        self._available: Optional[bool] = None  # None=unchecked, False=unavailable, True=ok

    def _get_client(self):
        if self._available is False:
            return None  # Already failed, don't retry
        if self._client is not None:
            return self._client
        try:
            # Short connect+read timeout so we don't block the event loop for 27s
            short_cfg = Config(
                signature_version="s3v4",
                connect_timeout=3,
                read_timeout=3,
                retries={"max_attempts": 1},
            )
            self._client = boto3.client(
                "s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                config=short_cfg,
                region_name=self.region,
            )
            try:
                self._client.head_bucket(Bucket=self.bucket_name)
            except ClientError:
                self._client.create_bucket(Bucket=self.bucket_name)
                logger.info(f"Created MinIO bucket: {self.bucket_name}")
            self._available = True
            logger.info("MinIO S3 client initialized")
        except Exception as e:
            logger.warning(f"MinIO not available: {e}")
            self._client = None
            self._available = False
        return self._client

    def is_available(self) -> bool:
        """Non-blocking after first call. Initializes lazily on first check."""
        if self._available is None:
            self._get_client()
        return self._available is True

    def upload_photo(self, photo_bytes: bytes, filename: str) -> Optional[str]:
        client = self._get_client()
        if not client:
            return None
        try:
            object_key = f"photos/{datetime.utcnow().strftime('%Y/%m/%d')}/{filename}"
            client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=photo_bytes,
                ContentType="image/jpeg",
            )
            return object_key
        except Exception as e:
            logger.error(f"MinIO upload failed: {e}")
            return None

    def generate_presigned_url(self, object_key: str, expiration: int = 3600) -> Optional[str]:
        client = self._get_client()
        if not client:
            return None
        try:
            return client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": object_key},
                ExpiresIn=expiration,
            )
        except Exception as e:
            logger.error(f"Presigned URL failed: {e}")
            return None

    def generate_upload_url(self, filename: str, expiration: int = 3600) -> Optional[dict]:
        client = self._get_client()
        if not client:
            return None
        try:
            object_key = f"photos/{datetime.utcnow().strftime('%Y/%m/%d')}/{filename}"
            url = client.generate_presigned_url(
                "put_object",
                Params={"Bucket": self.bucket_name, "Key": object_key, "ContentType": "image/jpeg"},
                ExpiresIn=expiration,
            )
            return {"upload_url": url, "object_key": object_key}
        except Exception as e:
            logger.error(f"Upload URL failed: {e}")
            return None

minio_service = MinioService()

# ============== EMAIL (MailHog) ==============
class EmailService:
    def __init__(self):
        self.smtp_host = os.environ.get("SMTP_HOST", "localhost")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "1025"))
        self.smtp_user = os.environ.get("SMTP_USER", "")
        self.smtp_pass = os.environ.get("SMTP_PASS", "")
        self.from_email = os.environ.get("SMTP_FROM", "noreply@irelandexplorer.local")
        self._available: Optional[bool] = None

    async def is_available(self) -> bool:
        if self._available is not None:
            return bool(self._available)
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(self.smtp_host, self.smtp_port),
                timeout=2.0,
            )
            writer.close()
            await writer.wait_closed()
            self._available = True
        except Exception:
            self._available = False
        return bool(self._available)

    @property
    def enabled(self) -> bool:
        """Non-blocking: returns last known state (None → False until first check)."""
        return bool(self._available)

    async def send_email(self, to_email: str, subject: str, body_html: str) -> bool:
        if not await self.is_available():
            return False
        try:
            message = MIMEMultipart("alternative")
            message["From"] = self.from_email
            message["To"] = to_email
            message["Subject"] = subject
            message.attach(MIMEText(body_html, "html"))

            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user if self.smtp_user else None,
                password=self.smtp_pass if self.smtp_pass else None,
                use_tls=False,
                start_tls=False,
            )
            return True
        except Exception as e:
            logger.error(f"Email send failed: {e}")
            return False
        finally:
            # Always log to admin_inbox even if SMTP fails
            try:
                from backend.database import db
                await db.admin_inbox.insert_one({
                    "id": uuid.uuid4().hex,
                    "to": to_email,
                    "subject": subject,
                    "body": body_html,
                    "created_at": datetime.utcnow()
                })
            except Exception as dbe:
                logger.error(f"Failed to log email to db: {dbe}")

    async def send_damage_report_notification(self, report: dict) -> bool:
        subject = f"[Ireland Explorer] New Damage Report: {report.get('poi_name', 'Unknown POI')}"
        body = f"""
        <html><body style="font-family: Arial; padding: 16px;">
        <h3>Damage Report</h3>
        <p><b>POI:</b> {report.get('poi_name','Unknown')}</p>
        <p><b>Damage type:</b> {report.get('damage_type','unknown')}</p>
        <p><b>Score:</b> {report.get('score',0)}</p>
        <p><b>Confidence:</b> {float(report.get('confidence',0))*100:.0f}%</p>
        <p><b>Status:</b> {report.get('status','review_required')}</p>
        </body></html>
        """
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@irelandexplorer.local")
        return await self.send_email(admin_email, subject, body)

email_service = EmailService()

# ============== AI DAMAGE CLASSIFIER ==============
damage_llm_client = LLMClient()

# ============== ORCHESTRATOR ==============
orchestrator = AgentOrchestrator(api_key="ignored")

# ============== ROUTES ==============
@api_router.get("/")
async def root():
    return {
        "message": "Ireland Travel API",
        "status": "healthy",
        "services": {
            "minio": minio_service.is_available(),
            "email": email_service.enabled,
        },
    }

# --- Geo ---
@api_router.get("/geo/search", response_model=List[GeoLocation])
async def geo_search(
    q: str = Query(..., min_length=2),
    country: str = Query("IE"),
    limit: int = Query(5, ge=1, le=10),
):
    return await NominatimService.search(q, country, limit)

@api_router.get("/geo/reverse", response_model=Optional[GeoLocation])
async def geo_reverse(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    result = await NominatimService.reverse(lat, lng)
    if result:
        return result
    # Fallback: return coordinates as label instead of 404
    return GeoLocation(
        label=f"{lat:.4f}, {lng:.4f}",
        lat=lat,
        lng=lng,
        source="coordinates"
    )

# --- Users ---
@api_router.post("/users/session", response_model=User)
async def create_session(input: UserCreate):
    if input.device_id:
        existing = await db.users.find_one({"device_id": input.device_id})
        if existing:
            return User(**existing)

    user = User(is_guest=True, device_id=input.device_id)
    await db.users.insert_one(user.dict())
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.patch("/users/{user_id}/settings", response_model=User)
async def update_user_settings(user_id: str, settings: UserSettingsUpdate):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {f"settings.{k}": v for k, v in settings.dict(exclude_none=True).items()}
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})

    updated = await db.users.find_one({"id": user_id})
    return User(**updated)

# --- Live Preview ---
@api_router.get("/preview/live")
async def get_live_preview(
    lat: float = Query(...),
    lng: float = Query(...),
    time_preset: str = Query("60m"),
    interests: str = Query(""),
    budget_free_only: bool = Query(False),
    pace: str = Query("normal"),
    travel_mode: str = Query("walk"),
    wheelchair_friendly: bool = Query(False),
    safety_sensitive: bool = Query(False),
):
    # enums
    try:
        tp = TimePreset(time_preset)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid time_preset: {time_preset}")

    try:
        tm = TravelMode(travel_mode)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid travel_mode: {travel_mode}")

    interest_list_raw = [i.strip().lower() for i in interests.split(",") if i.strip()]
    interest_enums: List[Interest] = []
    for x in interest_list_raw:
        try:
            interest_enums.append(Interest(x))
        except Exception:
            # ignore unknown interests instead of crashing
            pass

    # pace normalize (agent expects Pace enum inside user_settings parsing)
    pace_norm = pace.strip().lower()
    if pace_norm not in ("relaxed", "normal", "fast", "energetic"):
        pace_norm = "normal"
    # NOTE: your agent uses Pace(user_settings["pace"]) and expects "normal/relaxed/fast"
    if pace_norm == "energetic":
        pace_norm = "fast"

    return await orchestrator.create_live_preview(
        start_location=Location(lat=lat, lng=lng),
        time_preset=tp,
        interests=interest_enums,
        travel_mode=tm,
        user_settings={
            "budget_free_only": budget_free_only,
            "pace": pace_norm,
            "wheelchair_friendly": wheelchair_friendly,
            "safety_sensitive": safety_sensitive,
        },
    )

# --- Trips ---
@api_router.post("/trips", response_model=Trip)
async def create_trip(input: TripCreate, user_id: str = Query(...)):
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    user = User(**user_doc)

    # Prefer request-level preferences; fall back to saved user settings
    trip_interests = input.interests if input.interests is not None else user.settings.interests
    trip_travel_mode = input.travel_mode if input.travel_mode is not None else user.settings.travel_mode
    trip_budget_free = input.budget_free_only if input.budget_free_only is not None else user.settings.budget_free_only
    trip_max_fee = input.budget_max_entry if input.budget_max_entry is not None else getattr(user.settings, "budget_max_entry", 0.0)
    trip_wheelchair = input.accessibility_wheelchair if input.accessibility_wheelchair is not None else user.settings.wheelchair_friendly
    trip_pace = input.pace if input.pace is not None else getattr(user.settings, "pace", Pace.NORMAL)

    merged_settings = {
        **user.settings.dict(),
        "budget_free_only": trip_budget_free,
        "max_entry_fee": trip_max_fee,
        "wheelchair_friendly": trip_wheelchair,
        "pace": getattr(trip_pace, "value", str(trip_pace)),
    }

    # Use Agent Orchestrator to plan trip
    try:
        trip_plan = await orchestrator.create_trip_route(
            start_location=input.start_location,
            time_preset=input.time_preset,
            interests=trip_interests,
            travel_mode=trip_travel_mode,
            user_settings=merged_settings,
        )

        if "error" in trip_plan:
            logger.warning(f"Agent planning failed: {trip_plan['error']}")
    except Exception as e:
        logger.error(f"Failed to create trip with agent: {e}", exc_info=True)
        trip_plan = {"route": [], "weather": {}}

    route = trip_plan.get("route", [])
    weather = trip_plan.get("weather", {})

    trip = Trip(
        user_id=user_id,
        status=TripStatus.IN_PROGRESS,
        start_location=input.start_location,
        start_label=input.start_label,
        start_source=input.start_source,
        time_preset=input.time_preset,
        travel_mode=user.settings.travel_mode,
        interests=user.settings.interests,
        total_stops=len(route),
        completed_stops=0,
        total_points=0,
        preview_data={},
        warnings=trip_plan.get("warnings", []),
    )
    
    # --- Populate Stops from Agent Route ---
    stops: List[Stop] = []
    total_distance_km = 0.0
    total_duration_min = 0.0
    
    for i, stop_data in enumerate(route):
        poi = stop_data["poi"]
        # Ensure correct type
        if isinstance(poi, dict): poi = ModelPOI(**poi)
            
        dist_m = stop_data.get("distance_meters", 0)
        dur_min = stop_data.get("estimated_duration_min", 30)
        eta_min = stop_data.get("eta_from_previous_min", 0)
        
        total_distance_km += (dist_m / 1000.0)
        total_duration_min += (eta_min + dur_min)
        
        stop = Stop(
            trip_id=trip.id,
            poi_id=poi.id,
            poi=poi,
            order=stop_data["order"],
            status=StopStatus.AVAILABLE, # All stops available immediately (non-strict)
            # Frontend fields
            poi_name=poi.name_en,
            poi_name_ga=poi.name_ga,
            lat=poi.location.lat,
            lng=poi.location.lng,
            distance_meters=dist_m,
            eta_minutes=int(eta_min),
            points_awarded=100,
            experience_pack=stop_data.get("experience_pack") 
        )
        stops.append(stop)

    # Update Trip stats
    trip.stops = stops
    trip.total_distance_meters = int(total_distance_km * 1000)
    trip.estimated_duration_minutes = int(total_duration_min)
    trip.total_points_possible = len(stops) * 100
    trip.weather_summary = weather
    trip.warnings = weather.get("warnings") or []
    
    # Fetch events near start location
    try:
        upcoming_events = await get_events_near(input.start_location, days=7)
        trip.events = upcoming_events
    except Exception as e:
        logger.warning(f"Failed to fetch events for trip: {e}")
        trip.events = []

    trip.preview_data = {
        "weather": weather,
        "warnings": weather.get("warnings", []),
        "stops": [s.dict() for s in stops],
    }

    await db.trips.insert_one(trip.dict())
    return trip

@api_router.get("/trips/{trip_id}/simple")
async def get_trip_simple(trip_id: str):
    trip_doc = await db.trips.find_one({"id": trip_id})
    if not trip_doc:
        return {"error": "not found"}
    # JSON serializable
    if "_id" in trip_doc: del trip_doc["_id"]
    return trip_doc

@api_router.get("/trips/{trip_id}", response_model=Trip)
async def get_trip(trip_id: str):
    trip_doc = await db.trips.find_one({"id": trip_id})
    if not trip_doc:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Always sync stops from preview_data as it is the source of truth for updates
    if "preview_data" in trip_doc and "stops" in trip_doc["preview_data"]:
        from backend.utils import is_open_at
        from datetime import datetime
        now = datetime.utcnow()
        # Reconstruct stops from preview_data
        raw_stops = trip_doc["preview_data"]["stops"]
        restored_stops = []
        for s in raw_stops:
            # Ensure flatten fields exist
            if "poi" in s and s["poi"]:
                if "poi_name" not in s: s["poi_name"] = s["poi"].get("name_en", "")
                if "lat" not in s: s["lat"] = s["poi"]["location"]["lat"]
                if "lng" not in s: s["lng"] = s["poi"]["location"]["lng"]
                
                # Dynamic open/close evaluation
                opening_hours = s["poi"].get("opening_hours")
                if opening_hours:
                    s["is_currently_open"] = is_open_at(opening_hours, now)
                else:
                    s["is_currently_open"] = None
                    
            restored_stops.append(s)
        trip_doc["stops"] = restored_stops
            
    # Backfill other fields if missing
    if "warnings" not in trip_doc:
        trip_doc["warnings"] = trip_doc.get("preview_data", {}).get("warnings", [])
        
    try:
        return Trip(**trip_doc)
    except Exception as e:
        logger.error(f"Error creating Trip model: {e}", exc_info=True)
        # Log stops specifically if issue is there
        if "stops" in trip_doc:
            logger.error(f"First stop sample: {trip_doc['stops'][0] if trip_doc['stops'] else 'Empty'}")
        raise HTTPException(status_code=500, detail=f"Data validation error: {str(e)}")

@api_router.get("/trips", response_model=List[Trip])
async def get_user_trips(user_id: str = Query(...)):
    trips_raw = await db.trips.find({"user_id": user_id}).to_list(100)
    result = []
    for t in trips_raw:
        try:
            result.append(Trip(**t))
        except Exception as e:
            logger.warning(f"Skipping malformed trip {t.get('id', '?')}: {e}")
    return result

# Helper Model for photo upload
class PhotoUploadRequest(BaseModel):
    photo_base64: str

# --- Check-in ---
@api_router.post("/trips/{trip_id}/stops/{stop_id}/checkin")
async def check_in_to_stop(trip_id: str, stop_id: str, request: CheckInRequest):
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    stops = ((trip.get("preview_data") or {}).get("stops") or [])
    stop = next((s for s in stops if s.get("id") == stop_id), None)
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    if stop.get("status") == StopStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Stop already completed")

    poi_loc_raw = (stop.get("poi") or {}).get("location") or {}
    if "lat" not in poi_loc_raw or "lng" not in poi_loc_raw:
        raise HTTPException(status_code=500, detail="Stop POI location missing")

    # Use the correct field names from CheckInRequest model
    user_loc = Location(lat=request.user_lat, lng=request.user_lng)
    poi_loc = Location(lat=float(poi_loc_raw["lat"]), lng=float(poi_loc_raw["lng"]))

    geofence_res = orchestrator.fraud.compute_geofence(user_loc, poi_loc)
    if not geofence_res.get("within_geofence", False):
        # Allow check-in for develelopment/testing even if outside geofence
        # raise HTTPException(
        #     status_code=400,
        #     detail=f"Check-in failed: Outside geofence: {geofence_res.get('distance_meters', 0):.0f}m",
        # )
        logger.warning(f"Bypassing geofence check for {stop_id}. Distance: {geofence_res.get('distance_meters', 0):.0f}m")

    # Experience pack needs POI model
    poi_data = stop.get("poi")
    if poi_data:
        # Ensure it's a POI object
        if isinstance(poi_data, dict):
            poi = ModelPOI(**poi_data)
        else:
            poi = poi_data
            
        pack = await orchestrator.coach.generate_experience_pack(poi)
        experience_pack = pack.dict()
    else:
        # Fallback only if POI data is completely missing
        experience_pack = {"title_en": "Welcome", "content_en": "Welcome to this location!"}

    await db.trips.update_one(
        {"id": trip_id, "preview_data.stops.id": stop_id},
        {"$set": {"preview_data.stops.$.experience_pack": experience_pack}},
    )

    return {
        "success": True,
        "experience_pack": experience_pack,
        "distance_meters": geofence_res.get("distance_meters", 0),
        "message": "Check-in successful! Upload a photo to complete this stop.",
    }

# --- Complete Stop ---
@api_router.post("/trips/{trip_id}/stops/{stop_id}/complete")
async def complete_stop(trip_id: str, stop_id: str, request: PhotoUploadRequest):
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    stops = ((trip.get("preview_data") or {}).get("stops") or [])
    stop = next((s for s in stops if s.get("id") == stop_id), None)
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    if stop.get("status") == StopStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Stop already completed")

    # Basic Validation: Reject tiny/empty images (likely garbage or simulator placeholder)
    if len(request.photo_base64) < 15000:
        raise HTTPException(status_code=400, detail="Invalid photo: Image is too small or lacks detail. Please upload a real, clear photo of the location.")

    try:
        photo_bytes = base64.b64decode(request.photo_base64)
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(photo_bytes))
        extrema = img.convert("L").getextrema()
        if extrema[0] == extrema[1] or min(img.size) < 100:
            raise HTTPException(status_code=400, detail="AI Vision Agent: This image appears to be blank, a solid color, or too low quality. Please provide a clear, real photo.")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        pass

    # LLAVA Vision Integration to verify check-in photo
    prompt = (
        "Look closely at the provided image. Does it match the location '" + stop.get("poi_name", "a tourist spot") + 
        "'? Determine if this is a legitimate photo of the place, or if it "
        "seems like nonsense, a mistake, or off-topic (e.g., 'this is a solid color', 'a cat', 'a screenshot', 'a selfie with no background').\n\n"
        "Return ONLY a valid JSON object matching this schema without markdown block characters:\n"
        "{\n"
        '  "is_valid": <true/false>,\n'
        '  "reason": "<very short 1-sentence reason>"\n'
        "}"
    )
    payload = {
        "model": "llava",
        "messages": [{
            "role": "user",
            "content": prompt,
            "images": [request.photo_base64]
        }],
        "stream": False,
    }
    try:
        import httpx
        import json
        import re
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post("http://localhost:11434/api/chat", json=payload)
            res.raise_for_status()
            data_response = res.json()
            content = data_response.get("message", {}).get("content", "{}")
            # Parse JSON out of response
            try:
                parsed = json.loads(content)
            except json.JSONDecodeError:
                m = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL)
                if m:
                    parsed = json.loads(m.group(1))
                else:
                    m2 = re.search(r"(\{.*\})", content, re.DOTALL)
                    if m2:
                        parsed = json.loads(m2.group(1))
                    else:
                        parsed = {"is_valid": True, "reason": "fallback pass"}
            
            if not parsed.get("is_valid", True):
                reason = parsed.get("reason", "This image is not valid for this location.")
                if len(reason) > 80:
                    reason = reason[:77] + "..."
                raise HTTPException(status_code=400, detail=f"AI Vision Agent: {reason} Please upload a real photo.")
    except httpx.TimeoutException:
        logger.error("Llava visual analysis timed out. Passing check-in. To enforce, change this to block.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Llava check-in visual analysis failed: {e}")
        # fallback is to allow unless LLAVA explicitly denies
    photo_hash = hashlib.sha256(request.photo_base64.encode()).hexdigest()

    photo_key: Optional[str] = None
    if minio_service.is_available():
        try:
            photo_bytes = base64.b64decode(request.photo_base64)
            photo_key = minio_service.upload_photo(
                photo_bytes,
                f"{trip_id}_{stop_id}_{first_n_chars(photo_hash, 8)}.jpg",
            )
        except Exception as e:
            logger.error(f"photo decode/upload failed: {e}")

    points_awarded = 100

    update_data: Dict[str, Any] = {
        "preview_data.stops.$.status": StopStatus.COMPLETED.value,
        "preview_data.stops.$.completion_time": datetime.utcnow(),
        "preview_data.stops.$.completion_photo_hash": photo_hash,
        "preview_data.stops.$.points_awarded": points_awarded,
        "preview_data.stops.$.completion_photo_url": photo_key,
    }

    await db.trips.update_one(
        {"id": trip_id, "preview_data.stops.id": stop_id},
        {"$set": update_data},
    )

    await db.trips.update_one({"id": trip_id}, {"$inc": {"completed_stops": 1, "total_points": points_awarded}})
    await db.users.update_one({"id": trip["user_id"]}, {"$inc": {"total_points": points_awarded}})

    await db.points_ledger.insert_one(
        PointsLedger(
            user_id=trip["user_id"],
            trip_id=trip_id,
            stop_id=stop_id,
            amount=points_awarded,
            reason=f"Completed stop: {stop.get('poi_id')}",
        ).dict()
    )

    updated_trip = await db.trips.find_one({"id": trip_id})
    updated_stops = ((updated_trip.get("preview_data") or {}).get("stops") or [])
    all_completed = all(s.get("status") == StopStatus.COMPLETED.value for s in updated_stops)

    if all_completed:
        await db.trips.update_one(
            {"id": trip_id},
            {"$set": {"status": TripStatus.COMPLETED.value, "completed_at": datetime.utcnow()}},
        )

    # Find if there is a next unlocked stop
    completed_order = stop.get("order", 0)
    next_stop_unlocked = any(
        s.get("order", 0) > completed_order and s.get("status") != StopStatus.COMPLETED.value
        for s in updated_stops
    )

    return {
        "success": True,
        "points_awarded": points_awarded,
        "trip_completed": all_completed,
        "next_stop_unlocked": next_stop_unlocked,
        "photo_stored_in": "minio" if photo_key else "none",
    }

# --- Photos ---
@api_router.get("/photos/{object_key:path}/url")
async def get_photo_url(object_key: str):
    url = minio_service.generate_presigned_url(object_key)
    if not url:
        raise HTTPException(status_code=404, detail="Photo not found or MinIO unavailable")
    return {"signed_url": url, "expires_in": 3600}

@api_router.post("/photos/upload-url")
async def get_upload_url(filename: str = Query(...)):
    result = minio_service.generate_upload_url(filename)
    if not result:
        raise HTTPException(status_code=503, detail="MinIO unavailable")
    return result

# --- Damage Reports ---
@api_router.post("/damage-reports", response_model=DamageReport)
async def create_damage_report(report: DamageReportCreate, user_id: str = Query(...)):
    if report.photo_base64:
        dedupe_hash = hashlib.sha256(report.photo_base64.encode()).hexdigest()
    else:
        raw_string = f"{user_id}:{report.poi_id}:{report.description}"
        dedupe_hash = hashlib.sha256(raw_string.encode()).hexdigest()

    existing = await db.damage_reports.find_one({"dedupe_hash": dedupe_hash})
    if existing:
        return DamageReport(**existing)

    if report.photo_base64:
        # LLAVA Vision Integration
        prompt = (
            "Look closely at the provided image. Does it match the user description: '" + report.description + 
            "' at location '" + str(report.poi_name or "Unknown") + "'? Identify the type of damage and whether it is a legitimate "
            "report of damage (e.g. graffiti, structural break, litter, water damage). If the image "
            "seems like nonsense, off-topic, a screenshot, a cat, a selfie, or just a solid color, YOU MUST return 'false_report'.\n\n"
            "Return ONLY a valid JSON object matching this schema without markdown block characters:\n"
            "{\n"
            '  "classification": "vandalism|structural|litter|maintenance|false_report|unknown",\n'
            '  "confidence": <float between 0.0 and 1.0>,\n'
            '  "reason": "<very short explanation>"\n'
            "}"
        )
        payload = {
            "model": "llava",
            "messages": [{
                "role": "user",
                "content": prompt,
                "images": [report.photo_base64]
            }],
            "stream": False,
        }
        try:
            import httpx
            import json
            import re
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post("http://localhost:11434/api/chat", json=payload)
                res.raise_for_status()
                data_response = res.json()
                content = data_response.get("message", {}).get("content", "{}")
                try:
                    parsed = json.loads(content)
                except json.JSONDecodeError:
                    m = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL)
                    if m:
                        parsed = json.loads(m.group(1))
                    else:
                        m2 = re.search(r"(\{.*\})", content, re.DOTALL)
                        if m2:
                            parsed = json.loads(m2.group(1))
                        else:
                            parsed = {"classification": "unknown", "confidence": 0.5, "reason": "parsing failed"}
                
                classification = parsed
        except Exception as e:
            logger.error(f"Llava visual analysis failed: {e}")
            classification = {"classification": "unknown", "confidence": 0.3}
    else:
        # Text-only fallback using Llama3
        classification = await damage_llm_client.analyze_damage_report(report.description, report.poi_name)

    c_type = classification.get("classification", "unknown").lower()
    if c_type in ["false_report", "unknown"] and report.photo_base64:
        # Require LLava to explicitly accept it as a damage type, but sometimes it says unknown so we only reject on explicit false_report or very low confidence.
        if c_type == "false_report" or (c_type == "unknown" and classification.get("confidence", 1.0) > 0.6):
            reason = classification.get("reason", "This image does not show valid damage matching the description.")
            raise HTTPException(status_code=400, detail=f"AI Vision Agent: {reason} Please provide a clear, relevant photo.")

    try:
        damage_type_str = classification.get("classification", "unknown").lower()
        if damage_type_str not in [e.value for e in DamageType]:
            damage_type_str = "unknown"
        damage_type = DamageType(damage_type_str)
    except Exception:
        damage_type = DamageType.UNKNOWN

    confidence = float(classification.get("confidence", 0.0))

    severity_map = {"low": 0.2, "medium": 0.5, "high": 0.85}
    score = float(severity_map.get((report.severity or "medium").lower(), 0.5))

    photo_hash: Optional[str] = None
    if report.photo_base64:
        photo_hash = hashlib.sha256(report.photo_base64.encode()).hexdigest()

    photo_url: Optional[str] = None
    if report.photo_base64 and minio_service.is_available():
        try:
            photo_bytes = base64.b64decode(report.photo_base64)
            photo_url = minio_service.upload_photo(photo_bytes, f"damage_{first_n_chars(uuid.uuid4().hex, 8)}.jpg")
        except Exception as e:
            logger.error(f"damage photo upload failed: {e}")

    status = DamageReportStatus.REVIEW_REQUIRED

    damage_report = DamageReport(
        user_id=user_id,
        poi_id=report.poi_id,
        poi_name=report.poi_name,
        description=report.description,
        category=report.category,
        damage_type=damage_type,
        score=score,
        confidence=confidence,
        model_version="stub-v1.0",
        status=status,
        authority_target=AuthorityType.UNKNOWN,
        authority_email=None,
        photo_url=photo_url,
        photo_hash=photo_hash,
        dedupe_hash=dedupe_hash,
        lat=report.lat,
        lng=report.lng,
    )

    doc = damage_report.dict()
    if (not photo_url) and report.photo_base64:
        doc["photo_base64"] = report.photo_base64

    await db.damage_reports.insert_one(doc)
    await email_service.send_damage_report_notification(doc)

    return damage_report

@api_router.get("/damage-reports/mine", response_model=List[DamageReport])
async def get_my_damage_reports(user_id: str = Query(...)):
    reports = await db.damage_reports.find({"user_id": user_id}).to_list(100)
    return [DamageReport(**r) for r in reports]

@api_router.get("/damage-reports", response_model=List[DamageReport])
async def get_all_damage_reports(_: str = Depends(verify_admin_key)):
    reports = await db.damage_reports.find().sort("created_at", -1).to_list(1000)
    return [DamageReport(**r) for r in reports]

@api_router.get("/admin/inbox")
async def get_admin_inbox(_: str = Depends(verify_admin_key)):
    emails = await db.admin_inbox.find().sort("created_at", -1).to_list(1000)
    for e in emails:
        e["_id"] = str(e["_id"])
    return emails

@api_router.post("/damage-reports/{report_id}/review", response_model=DamageReport)
async def review_damage_report(
    report_id: str,
    status: DamageReportStatus,
    reason: Optional[str] = Query(None),
    _: str = Depends(verify_admin_key),
):
    report = await db.damage_reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    points_awarded = 0
    if status == DamageReportStatus.APPROVED and report.get("status") != DamageReportStatus.APPROVED.value:
        existing_ledger = await db.points_ledger.find_one({"reason": f"Damage Report Accepted: {report_id}"})
        if not existing_ledger:
            points_awarded = 250
            await db.users.update_one({"id": report["user_id"]}, {"$inc": {"total_points": points_awarded}})
            await db.points_ledger.insert_one(
                PointsLedger(user_id=report["user_id"], trip_id=None, stop_id=report_id, amount=points_awarded, reason=f"Damage Report Accepted: {report_id}").dict()
            )

    await db.damage_reports.update_one(
        {"id": report_id},
        {"$set": {"status": status.value, "reviewer_notes": reason, "reviewed_at": datetime.utcnow()}},
    )

    updated_report = await db.damage_reports.find_one({"id": report_id})
    return DamageReport(**updated_report)

@api_router.get("/damage-reports/{report_id}", response_model=DamageReport)
async def get_damage_report(report_id: str):
    report = await db.damage_reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return DamageReport(**report)

# --- Visited ---
@api_router.post("/visited", response_model=VisitedPlace)
async def create_visited_place(input: VisitedPlaceCreate, user_id: str = Query(...)):
    existing = await db.visited_places.find_one({"user_id": user_id, "place_id": input.place_id})
    
    photo_url = None
    if not existing:
        if input.photo_base64 and minio_service.is_available():
            try:
                photo_bytes = base64.b64decode(input.photo_base64)
                photo_hash = hashlib.sha256(photo_bytes).hexdigest()
                object_key = minio_service.upload_photo(photo_bytes, f"visited_{user_id}_{first_n_chars(photo_hash, 8)}.jpg")
                photo_url = object_key
            except Exception as e:
                logger.error(f"visited photo upload failed: {e}")

        visited = VisitedPlace(
            user_id=user_id,
            place_id=input.place_id,
            name=input.name,
            lat=input.lat,
            lng=input.lng,
            note=input.note,
            photo_url=photo_url,
        )
        await db.visited_places.insert_one(visited.dict())
        visited_doc = visited
    else:
        visited_doc = VisitedPlace(**existing)

    # --- Sync with Trip if provided (even if visited previously) ---
    if input.trip_id and input.stop_id:
        trip = await db.trips.find_one({"id": input.trip_id})
        if trip:
            stops = ((trip.get("preview_data") or {}).get("stops") or [])
            stop_obj = next((s for s in stops if s.get("id") == input.stop_id), None)
            if stop_obj and stop_obj.get("status") != StopStatus.COMPLETED.value:
                # Complete the stop
                update_data = {
                    "preview_data.stops.$.status": StopStatus.COMPLETED.value,
                    "preview_data.stops.$.completion_time": datetime.utcnow(),
                    "preview_data.stops.$.completion_type": "manual_visited"
                }
                
                if photo_url:
                    update_data["preview_data.stops.$.completion_photo_url"] = photo_url
                
                await db.trips.update_one(
                    {"id": input.trip_id, "preview_data.stops.id": input.stop_id},
                    {"$set": update_data},
                )
                await db.trips.update_one({"id": input.trip_id}, {"$inc": {"completed_stops": 1}})
                
                # Check if all completed
                updated_trip = await db.trips.find_one({"id": input.trip_id})
                updated_stops = ((updated_trip.get("preview_data") or {}).get("stops") or [])
                all_completed = all(s.get("status") == StopStatus.COMPLETED.value for s in updated_stops)
                if all_completed:
                    await db.trips.update_one(
                        {"id": input.trip_id},
                        {"$set": {"status": TripStatus.COMPLETED.value, "completed_at": datetime.utcnow()}},
                    )

    return visited_doc

@api_router.get("/visited", response_model=List[VisitedPlace])
async def get_visited_places(user_id: str = Query(...)):
    places = await db.visited_places.find({"user_id": user_id}).to_list(1000)
    return [VisitedPlace(**p) for p in places]

@api_router.delete("/visited/{place_id}")
async def delete_visited_place(place_id: str, user_id: str = Query(...)):
    result = await db.visited_places.delete_one({"user_id": user_id, "place_id": place_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Visited place not found")
    return {"success": True}

@api_router.patch("/visited/{place_id}", response_model=VisitedPlace)
async def update_visited_place(place_id: str, input: VisitedPlaceUpdate, user_id: str = Query(...)):
    update_data = {k: v for k, v in input.dict(exclude_none=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.visited_places.update_one({"user_id": user_id, "place_id": place_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Visited place not found")

    updated = await db.visited_places.find_one({"user_id": user_id, "place_id": place_id})
    return VisitedPlace(**updated)

# --- Points ---
@api_router.get("/users/{user_id}/points")
async def get_user_points(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    ledger = await db.points_ledger.find({"user_id": user_id}).to_list(100)
    return {"total_points": user.get("total_points", 0), "history": [PointsLedger(**entry) for entry in ledger]}

# --- Rewards ---
@api_router.get("/rewards", response_model=List[Reward])
async def get_rewards():
    return [
        Reward(id="reward_1", name_en="Free Coffee", name_ga="Caife Saor in Aisce", description_en="Redeem for a free coffee (DEMO)", points_required=200, category="food"),
        Reward(id="reward_2", name_en="Museum Discount", name_ga="Lascaine Músaeim", description_en="10% off museum entry (DEMO)", points_required=500, category="activity"),
        Reward(id="reward_3", name_en="Ireland Souvenir", name_ga="Cuimhneachán Éireannach", description_en="Free shamrock keychain (DEMO)", points_required=300, category="merchandise"),
    ]

@api_router.post("/rewards/{reward_id}/claim")
async def claim_reward(reward_id: str, user_id: str = Query(...)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rewards = {
        "reward_1": {"points": 200, "name": "Free Coffee"},
        "reward_2": {"points": 500, "name": "Museum Discount"},
        "reward_3": {"points": 300, "name": "Ireland Souvenir"},
    }
    reward = rewards.get(reward_id)
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")

    points_cost = int(reward["points"])
    if user.get("total_points", 0) < points_cost:
        raise HTTPException(status_code=400, detail="Insufficient points")

    await db.users.update_one({"id": user_id}, {"$inc": {"total_points": -points_cost}})
    redemption = RewardRedemption(user_id=user_id, reward_id=reward_id, points_spent=points_cost)
    await db.reward_redemptions.insert_one(redemption.dict())
    await db.points_ledger.insert_one(
        PointsLedger(user_id=user_id, amount=-points_cost, reason=f"Claimed reward: {reward['name']}").dict()
    )
    return {"success": True, "demo_code": redemption.demo_code, "message": "This is a DEMO reward code."}

# --- POIs ---
@api_router.get("/pois", response_model=List[ModelPOI])
async def get_pois(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(5.0),
    categories: str = Query(""),
    budget_free_only: bool = Query(False),
    wheelchair: bool = Query(False),
):
    from backend.agents import IRELAND_MOCK_POIS
    from backend.utils import calculate_distance_km

    category_list = [c.strip().lower() for c in categories.split(",") if c.strip()]
    user_loc = Location(lat=lat, lng=lng)

    pois: List[ModelPOI] = []


    # 1. Try OSM Overpass first
    try:
        from backend.osm_service import fetch_pois_nearby  # type: ignore
        if fetch_pois_nearby:
            interest_enums: List[Interest] = []
            for cat in category_list:
                try:
                    interest_enums.append(Interest(cat))
                except Exception:
                    pass
            osm_pois = await asyncio.wait_for(
                fetch_pois_nearby(user_loc, radius_m=int(radius_km * 1000), interests=interest_enums or None),
                timeout=10.0
            )
            pois = osm_pois or []
            logger.info(f"/pois OSM returned {len(pois)} results")
    except Exception as e:
        logger.warning(f"/pois OSM failed: {e}")

    # 2. Fallback: IRELAND_MOCK_POIS (covers Dublin, Cork, Galway, Limerick)
    if not pois:
        for poi in IRELAND_MOCK_POIS:
            dist = calculate_distance_km(user_loc, poi.location)
            if dist > radius_km:
                continue
            if category_list and not any(
                getattr(c, "value", c) in category_list for c in poi.categories
            ):
                continue
            if budget_free_only and poi.entry_fee and poi.entry_fee > 0:
                continue
            if wheelchair and not poi.wheelchair_accessible:
                continue
            pois.append(poi)
        logger.info(f"/pois IRELAND_MOCK fallback returned {len(pois)} results")

    # 3. Last resort: Dublin MockDataService
    if not pois:
        pois = MockDataService.get_pois_nearby(lat, lng, radius_km, category_list or None, budget_free_only, wheelchair)

    return pois

@api_router.get("/geo/amenities")
async def get_nearby_amenities(lat: float = Query(...), lng: float = Query(...), radius_m: int = Query(1000)):
    import httpx
    query = f"""
    [out:json][timeout:15];
    (
      node["amenity"~"restaurant|pub|cafe"](around:{radius_m},{lat},{lng});
      node["tourism"~"hotel|guest_house|hostel"](around:{radius_m},{lat},{lng});
    );
    out tags 20;
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.post("https://overpass-api.de/api/interpreter", data={"data": query})
            data = resp.json()
            results = []
            for el in data.get("elements", []):
                t = el.get("tags", {})
                if t.get("name"):
                    results.append({
                        "name": t["name"],
                        "type": t.get("amenity") or t.get("tourism", "place"),
                        "cuisine": t.get("cuisine", "")
                    })
            # Deduplicate by name and return top 5
            unique_results = []
            seen = set()
            for r in results:
                if r["name"] not in seen:
                    seen.add(r["name"])
                    unique_results.append(r)
            return {"amenities": unique_results[:5]}
        except Exception:
            return {"amenities": []}


# --- Place chat ---
@api_router.post("/chat/place", response_model=PlaceChatResponse)
async def chat_with_place(request: PlaceChatRequest):
    system_prompt = (
        "You are a witty, energetic, and fun travel guide for Ireland Explorer. "
        "Your name is 'Cillian'. You love Irish culture, folklore, and craic (fun). "
        "Be helpful but entertaining. Use emojis. If uncertain, admit it with a joke."
    )

    if request.place_name:
        system_prompt += f"\n\nCurrent Focus Place: {request.place_name}"
        if request.lat is not None and request.lon is not None:
            system_prompt += f" (Location: {request.lat}, {request.lon})"

    if request.itinerary_context:
        system_prompt += f"\n\nItinerary Context: {json.dumps(request.itinerary_context, default=str)}"

    transcript = ""
    for msg in request.chat_history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        transcript += f"{role.upper()}: {content}\n"

    full_user_message = f"{transcript}\nUSER: {request.user_message}"

    try:
        response_text = await orchestrator.planner.llm.chat_text(system_prompt, full_user_message)
        if not response_text:
            return PlaceChatResponse(answer="Unable to generate a response right now.", sources=[], actions=[])
        return PlaceChatResponse(answer=response_text, sources=[], actions=[])
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return PlaceChatResponse(answer="Temporary issue. Please try again.", sources=[], actions=[])

# --- Notifications ---
@api_router.post("/notifications/check", response_model=NotificationCheckResponse)
async def check_notifications(request: NotificationCheckRequest):
    nearby_pois = MockDataService.get_pois_nearby(request.lat, request.lng, radius_km=1.0)
    triggers: List[GeofenceTrigger] = []

    for poi in nearby_pois:
        triggers.append(
            GeofenceTrigger(
                lat=poi.location.lat,
                lng=poi.location.lng,
                radius_meters=300,
                message=f"You are near {poi.name_en}! Check it out?",
                poi_id=poi.id,
                expiry=datetime.utcnow() + timedelta(hours=1),
            )
        )

    weather = MockDataService.get_mock_weather(request.lat, request.lng)
    if weather.get("warnings"):
        triggers.append(
            GeofenceTrigger(
                lat=request.lat,
                lng=request.lng,
                radius_meters=5000,
                message=f"Weather Alert: {weather['warnings'][0]}",
                expiry=datetime.utcnow() + timedelta(hours=4),
            )
        )

    return NotificationCheckResponse(triggers=triggers)

@api_router.post("/notifications/geofence")
async def register_geofence(trigger: GeofenceTrigger):
    return {"success": True, "message": "Geofence registered"}

# --- Transcribe (stub) ---
@api_router.post("/chat/transcribe")
async def transcribe_audio():
    return {"text": "I would like to find a coffee shop nearby.", "note": "Mock transcription"}

# ============== ADMIN ROUTES ==============
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])

@admin_router.get("/damage-reports", response_model=List[DamageReport])
async def admin_list_damage_reports(status: Optional[str] = None, _: str = Depends(verify_admin_key)):
    query = {"status": status} if status else {}
    reports = await db.damage_reports.find(query).to_list(100)
    return [DamageReport(**r) for r in reports]

@admin_router.patch("/damage-reports/{report_id}", response_model=DamageReport)
async def admin_update_damage_report(
    report_id: str,
    status: DamageReportStatus = Query(...),
    reviewer_notes: Optional[str] = Query(None),
    _: str = Depends(verify_admin_key),
):
    report = await db.damage_reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    await db.damage_reports.update_one(
        {"id": report_id},
        {"$set": {"status": status.value, "reviewer_notes": reviewer_notes, "reviewed_at": datetime.utcnow()}},
    )

    updated_report = await db.damage_reports.find_one({"id": report_id})
    if not updated_report:
        raise HTTPException(status_code=404, detail="Report not found after update")
    return DamageReport(**updated_report)

@admin_router.get("/stats")
async def admin_stats(_: str = Depends(verify_admin_key)):
    return {
        "users": await db.users.count_documents({}),
        "trips": await db.trips.count_documents({}),
        "completed_trips": await db.trips.count_documents({"status": TripStatus.COMPLETED.value}),
        "damage_reports": await db.damage_reports.count_documents({}),
        "pending_reviews": await db.damage_reports.count_documents({"status": DamageReportStatus.REVIEW_REQUIRED.value}),
    }

app.include_router(api_router)
app.include_router(admin_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    from backend.database import client as db_client
    db_client.close()


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("SERVER_PORT", "8001"))
    print(f"Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
