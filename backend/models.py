from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


# ============== ENUMS ==============
class Language(str, Enum):
    EN = "en"
    GA = "ga"  # Gaeilge (Irish)


class TravelMode(str, Enum):
    WALK = "walk"
    PUBLIC_TRANSPORT = "public_transport"
    CAR = "car"


class TimePreset(str, Enum):
    THIRTY_MIN = "30m"
    SIXTY_MIN = "60m"
    NINETY_MIN = "90m"
    TWO_HOURS = "2h"
    FOUR_HOURS = "4h"
    ONE_DAY = "1d"


class Interest(str, Enum):
    HISTORY = "history"
    NATURE = "nature"
    MUSEUMS = "museums_indoor"
    VIEWPOINTS = "viewpoints"


class Pace(str, Enum):
    RELAXED = "relaxed"
    NORMAL = "normal"
    FAST = "fast"


class StopStatus(str, Enum):
    AVAILABLE = "available"  # Current stop ready for check-in
    LOCKED = "locked"        # Future stops, not yet reachable
    COMPLETED = "completed"
    SKIPPED = "skipped"


class TripStatus(str, Enum):
    PREVIEW = "preview"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class POISource(str, Enum):
    FAILTE_IRELAND = "failte_ireland"
    OSM = "osm"
    NMS = "nms"  # National Monuments Service
    MOCK = "mock"


class ContentType(str, Enum):
    SOURCE_BACKED = "source_backed"
    GENERAL_SUGGESTION = "general_suggestion"


class AuthorityType(str, Enum):
    OPW = "opw"
    NMS = "nms"
    NPWS = "npws"
    LOCAL_COUNCIL = "local_council"
    FAILTE_IRELAND = "failte_ireland"
    UNKNOWN = "unknown"


class DamageReportStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SENT = "sent"
    REVIEW_REQUIRED = "review_required"
    FAILED = "failed"
    DISMISSED = "dismissed"


class DamageType(str, Enum):
    VANDALISM = "vandalism"
    GRAFFITI = "graffiti"
    STRUCTURAL = "structural"
    EROSION = "erosion"
    LITTERING = "littering"
    VEGETATION_DAMAGE = "vegetation_damage"
    UNKNOWN = "unknown"
    NONE = "none"


class StartLocationSource(str, Enum):
    GPS = "gps"
    MANUAL = "manual"


# ============== USER MODELS ==============
class LastStartLocation(BaseModel):
    label: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class UserSettings(BaseModel):
    language: Language = Language.EN
    interests: List[Interest] = Field(default_factory=lambda: [Interest.HISTORY, Interest.NATURE])
    travel_mode: TravelMode = TravelMode.WALK
    budget_free_only: bool = True
    max_entry_fee: float = 0.0
    wheelchair_friendly: bool = False
    low_incline: bool = False
    pace: Pace = Pace.NORMAL
    safety_sensitive: bool = False
    last_start_location: Optional[LastStartLocation] = None
    exclude_visited: bool = True


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_guest: bool = True
    device_id: Optional[str] = None
    email: Optional[str] = None
    settings: UserSettings = Field(default_factory=UserSettings)
    total_points: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(BaseModel):
    device_id: Optional[str] = None


class UserSettingsUpdate(BaseModel):
    language: Optional[Language] = None
    interests: Optional[List[Interest]] = None
    travel_mode: Optional[TravelMode] = None
    budget_free_only: Optional[bool] = None
    max_entry_fee: Optional[float] = None
    wheelchair_friendly: Optional[bool] = None
    low_incline: Optional[bool] = None
    pace: Optional[Pace] = None
    safety_sensitive: Optional[bool] = None
    last_start_location: Optional[LastStartLocation] = None
    exclude_visited: Optional[bool] = None


# ============== POI MODELS ==============
class Location(BaseModel):
    lat: float
    lng: float


class POI(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_en: str
    name_ga: Optional[str] = None
    description_en: str
    description_ga: Optional[str] = None
    location: Location
    categories: List[Interest] = Field(default_factory=list)
    source: POISource = POISource.MOCK
    source_id: Optional[str] = None
    opening_hours: Optional[str] = None
    entry_fee: Optional[float] = None
    wheelchair_accessible: bool = False
    coastal_cliff: bool = False
    image_url: Optional[str] = None
    authority_type: AuthorityType = AuthorityType.UNKNOWN
    authority_email: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class POIAuthorityUpdate(BaseModel):
    authority_type: AuthorityType
    authority_email: Optional[str] = None


# ============== TRIP / STOP MODELS ==============
class Stop(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_id: str
    poi_id: str
    poi: Optional[POI] = None
    order: int
    status: StopStatus = StopStatus.AVAILABLE
    estimated_duration_min: int = 15
    eta_from_previous_min: int = 0
    experience_pack: Optional[Dict[str, Any]] = None
    completion_photo_url: Optional[str] = None
    completion_photo_hash: Optional[str] = None
    completion_time: Optional[datetime] = None
    points_awarded: int = 0
    # Frontend compatibility fields
    poi_name: str = ""
    poi_name_ga: Optional[str] = None
    lat: float = 0.0
    lng: float = 0.0
    distance_meters: int = 0
    eta_minutes: int = 0
    is_currently_open: Optional[bool] = None


class Accommodation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # Hotel, B&B, Guesthouse, etc.
    location: Location
    address: Optional[str] = None
    telephone: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[str] = None
    amenities: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    location: Location
    start_date: str  # ISO format
    end_date: str    # ISO format
    website: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None

class Activity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str
    location: Location
    description: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    telephone: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None

class Trip(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    status: TripStatus = TripStatus.PREVIEW
    start_location: Location
    start_label: Optional[str] = None
    start_source: StartLocationSource = StartLocationSource.GPS
    time_preset: TimePreset
    travel_mode: TravelMode
    interests: List[Interest] = Field(default_factory=list)
    total_stops: int = 0
    completed_stops: int = 0
    total_points: int = 0
    completion_bonus_awarded: bool = False
    # Frontend compatibility fields
    stops: List[Stop] = Field(default_factory=list)
    total_distance_meters: float = 0.0
    estimated_duration_minutes: float = 0.0
    total_points_possible: int = 0
    points_earned: int = 0
    warnings: List[str] = Field(default_factory=list)
    events: List[Event] = Field(default_factory=list)
    weather_summary: Optional[Dict[str, Any]] = None
    preview_data: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class TripCreate(BaseModel):
    start_location: Location
    start_label: Optional[str] = None
    start_source: StartLocationSource = StartLocationSource.GPS
    time_preset: TimePreset
    include_visited: bool = False
    # Optional trip preferences — override user.settings if provided
    interests: Optional[List[Interest]] = None
    travel_mode: Optional[TravelMode] = None
    budget_free_only: Optional[bool] = None
    budget_max_entry: Optional[float] = None
    accessibility_wheelchair: Optional[bool] = None
    pace: Optional[Pace] = None


# ============== POINTS / REWARDS ==============
class PointsLedger(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    trip_id: Optional[str] = None
    stop_id: Optional[str] = None
    amount: int
    reason: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Reward(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_en: str
    name_ga: Optional[str] = None
    description_en: str
    description_ga: Optional[str] = None
    points_required: int
    category: str = "demo"
    is_active: bool = True
    image_url: Optional[str] = None


class RewardRedemption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    reward_id: str
    points_spent: int
    redeemed_at: datetime = Field(default_factory=datetime.utcnow)
    demo_code: str = Field(default_factory=lambda: f"DEMO-{uuid.uuid4().hex[:8].upper()}")


# ============== FRAUD ==============
class FraudFlag(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    trip_id: str
    stop_id: str
    reason: str
    risk_score: float
    location_submitted: Optional[Location] = None
    expected_location: Optional[Location] = None
    distance_meters: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============== DAMAGE REPORTING ==============
class DamageReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    trip_id: Optional[str] = None
    stop_id: Optional[str] = None
    poi_id: Optional[str] = None

    photo_url: Optional[str] = None
    photo_hash: Optional[str] = None
    photo_base64: Optional[str] = None

    dedupe_hash: Optional[str] = None

    damage_type: DamageType = DamageType.UNKNOWN
    category: Optional[str] = None
    description: Optional[str] = None

    score: float = 0.0
    confidence: float = 0.0
    model_version: str = "stub-v1.0"

    status: DamageReportStatus = DamageReportStatus.PENDING
    authority_target: AuthorityType = AuthorityType.UNKNOWN
    authority_email: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewer_notes: Optional[str] = None
    review_reason: Optional[str] = None

    poi_name: Optional[str] = None
    poi_location: Optional[Location] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class DamageReportCreate(BaseModel):
    poi_id: Optional[str] = None
    poi_name: Optional[str] = None
    description: str
    photo_base64: Optional[str] = None
    severity: str = "medium"
    category: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


# ============== VISITED PLACES ==============
class VisitedPlace(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    place_id: str
    name: str
    lat: float
    lng: float
    visited_at: datetime = Field(default_factory=datetime.utcnow)
    note: Optional[str] = None
    photo_url: Optional[str] = None


class VisitedPlaceCreate(BaseModel):
    place_id: str
    name: str
    lat: float
    lng: float
    note: Optional[str] = None
    photo_base64: Optional[str] = None
    trip_id: Optional[str] = None
    stop_id: Optional[str] = None

class VisitedPlaceUpdate(BaseModel):
    note: Optional[str] = None


# ============== EXPERIENCE PACK ==============
class ExperiencePack(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    poi_id: str
    title_en: str
    title_ga: Optional[str] = None
    content_en: str
    content_ga: Optional[str] = None
    fun_facts: List[Dict[str, str]] = Field(default_factory=list)
    safety_notes: List[str] = Field(default_factory=list)
    content_type: ContentType = ContentType.GENERAL_SUGGESTION
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ============== LIVE PREVIEW ==============
class WeatherSummary(BaseModel):
    temperature_c: float
    condition: str
    condition_ga: str
    wind_speed_kmh: float
    precipitation_chance: float
    warnings: List[str] = Field(default_factory=list)


class TransitSummary(BaseModel):
    available: bool = True
    disruptions: List[str] = Field(default_factory=list)
    nearest_stop: Optional[str] = None


class EventInfo(BaseModel):
    name: str
    location: str
    date: str
    category: str


class EstimatedStop(BaseModel):
    name: str
    category: str
    estimated_duration_min: int
    entry_fee: float = 0.0


class LivePreview(BaseModel):
    weather: WeatherSummary
    transit: TransitSummary
    events: List[EventInfo] = Field(default_factory=list)
    estimated_stops: int
    estimated_duration_min: int
    recommended_start_time: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    start_label: Optional[str] = None
    estimated_stop_details: List[EstimatedStop] = Field(default_factory=list)


# ============== CHECK-IN (SERVER.PY UYUMLU) ==============
# server.py check_in_to_stop içinde request.user_lat / request.user_lng kullanıyor.
class CheckInRequest(BaseModel):
    user_lat: float
    user_lng: float

    @property
    def user_location(self) -> "Location":
        return Location(lat=self.user_lat, lng=self.user_lng)


class CheckInResponse(BaseModel):
    success: bool
    message: str
    message_ga: Optional[str] = None
    points_awarded: int = 0
    trip_completed: bool = False
    completion_bonus: int = 0
    fraud_flagged: bool = False
    damage_detection_queued: bool = False


# ============== GEOCODING API ==============
class GeoSearchResult(BaseModel):
    label: str
    lat: float
    lng: float
    source: str = "nominatim"
    short_label: Optional[str] = None


class GeoSearchResponse(BaseModel):
    results: List[GeoSearchResult]
    query: str
    cached: bool = False


class GeoReverseResponse(BaseModel):
    label: str
    lat: float
    lng: float
    source: str = "nominatim"
    short_label: Optional[str] = None


# ============== PLACE CHATBOT ==============
# agent.py tarafında "lng" bekleniyor; eski "lon" gelirse de kabul edelim.
class PlaceChatRequest(BaseModel):
    place_id: Optional[str] = None
    place_name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    # Backward-compat: "lon" gelirse al, ama alan adı sistemde "lng" olsun.
    lon: Optional[float] = Field(default=None, exclude=True)

    itinerary_context: Optional[Dict[str, Any]] = None
    user_message: str
    chat_history: List[Dict[str, str]] = Field(default_factory=list)

    def model_post_init(self, __context: Any) -> None:
        # lon gönderildiyse lng’ye kopyala
        if self.lng is None and self.lon is not None:
            object.__setattr__(self, "lng", self.lon)


class PlaceChatResponse(BaseModel):
    answer: str
    sources: List[str] = Field(default_factory=list)
    actions: List[Dict[str, Any]] = Field(default_factory=list)


# ============== GEOFENCING / NOTIFICATIONS ==============
class GeofenceTrigger(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lat: float
    lng: float
    radius_meters: float
    message: str
    poi_id: Optional[str] = None
    expiry: Optional[datetime] = None


class NotificationCheckRequest(BaseModel):
    lat: float
    lng: float
    user_id: str


class NotificationCheckResponse(BaseModel):
    triggers: List[GeofenceTrigger]
