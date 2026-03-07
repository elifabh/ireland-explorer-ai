import sys
import os

# Add current directory to sys.path to fix module resolution
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from typing import List, Dict, Any, Optional
import logging
import hashlib

# Local imports (core deps must exist)
try:
    from .models import Location, TravelMode  # type: ignore
    from .data_services import MockDataService, NominatimService  # type: ignore
    from .utils import calculate_distance_km, estimate_travel_time_min  # type: ignore
except ImportError:
    from models import Location, TravelMode  # type: ignore
    from data_services import MockDataService, NominatimService  # type: ignore
    from utils import calculate_distance_km, estimate_travel_time_min  # type: ignore

# Optional "real" tools (can be missing in local dev)
try:
    from .real_tools import get_real_weather, google_search  # type: ignore
except ImportError:
    try:
        from real_tools import get_real_weather, google_search  # type: ignore
    except ImportError:
        get_real_weather = None  # type: ignore
        google_search = None  # type: ignore

try:
    from .osm_service import fetch_pois_nearby as osm_fetch  # type: ignore
except ImportError:
    try:
        from osm_service import fetch_pois_nearby as osm_fetch  # type: ignore
    except ImportError:
        osm_fetch = None  # type: ignore

logger = logging.getLogger(__name__)


async def get_weather(location: Location) -> Dict[str, Any]:
    """Get weather information for a specific location (real tool if available, else mock)."""
    if get_real_weather is not None:
        try:
            return await get_real_weather(location.lat, location.lng)  # type: ignore[misc]
        except Exception as e:
            logger.warning(f"Real weather tool failed, using mock. Error: {e}")

    # Mock fallback
    try:
        return MockDataService.get_mock_weather(location.lat, location.lng)
    except Exception as e:
        logger.error(f"MockDataService.get_mock_weather failed: {e}")
        return {
            "temperature_c": 0.0,
            "condition": "Unknown",
            "condition_ga": "Aimsir",
            "wind_speed_kmh": 0.0,
            "precipitation_chance": 0.0,
            "warnings": ["Weather unavailable"],
        }


def _safe_web_poi_id(title: str) -> str:
    title_bytes = (title or "unknown").encode("utf-8")
    return "web_" + hashlib.sha256(title_bytes).hexdigest()[:12]


def _safe_extract_text(res: Dict[str, Any], key: str, default: str) -> str:
    val = res.get(key)
    return val if isinstance(val, str) and val.strip() else default


def _safe_loc_defaults(location: Optional[Location]) -> tuple[float, float]:
    if location is not None and hasattr(location, "lat") and hasattr(location, "lng"):
        try:
            return float(location.lat), float(location.lng)
        except Exception:
            pass
    # Dublin fallback
    return 53.34, -6.26


def _safe_query_near(location: Optional[Location], query: str) -> str:
    lat, lng = _safe_loc_defaults(location)
    if location is None:
        return f"{query} near me"
    return f"{query} near {lat}, {lng}"


def _call_get_pois_nearby(lat: float, lng: float, radius_km: float):
    """
    MockDataService.get_pois_nearby imzası projede değişmiş olabilir.
    Bu yüzden bir kaç olası çağrıyı sırayla dener.
    """
    # En olası: (lat, lng, radius_km)
    try:
        return MockDataService.get_pois_nearby(lat, lng, radius_km)
    except TypeError:
        pass

    # Alternatif: (lat, lng, radius_km=...)
    try:
        return MockDataService.get_pois_nearby(lat, lng, radius_km=radius_km)
    except TypeError:
        pass

    # Alternatif: (lat, lng, radius_km, categories, budget_free_only, wheelchair)
    try:
        return MockDataService.get_pois_nearby(lat, lng, radius_km, None, False, False)
    except TypeError as e:
        raise RuntimeError(f"MockDataService.get_pois_nearby signature mismatch: {e}")


async def _call_nominatim_search(query: str, limit: int = 3) -> List[Any]:
    """
    NominatimService.search imzası farklı olabilir.
    Olası çağrıları sırayla dener.
    """
    # Olası: search(q, limit=3)
    try:
        return await NominatimService.search(query, limit=limit)
    except TypeError:
        pass

    # Olası: search(q, country="IE", limit=3)
    try:
        return await NominatimService.search(query, "IE", limit)
    except TypeError:
        pass

    # Olası: search(q, country="IE", limit=3) keyword
    try:
        return await NominatimService.search(query, country="IE", limit=limit)
    except TypeError as e:
        raise RuntimeError(f"NominatimService.search signature mismatch: {e}")


async def search_pois(
    query: str,
    location: Optional[Location] = None,
    radius_km: float = 10.0
) -> List[Dict[str, Any]]:
    """
    Search for POIs leveraging REAL web search for 'live' results.
    If real tool missing/fails, fallback to MockDataService / Nominatim.
    """
    q = (query or "").strip()
    if not q:
        return []

    # 1) Real web search (if available)
    try:
        if google_search is None:
            raise RuntimeError("google_search tool not available")

        search_query = _safe_query_near(location, q)
        loc_lat, loc_lng = _safe_loc_defaults(location)

        web_results = await google_search(search_query, max_results=3)  # type: ignore[misc]
        if not isinstance(web_results, list):
            raise RuntimeError("google_search returned non-list")

        real_pois: List[Dict[str, Any]] = []
        for res in web_results:
            if not isinstance(res, dict):
                continue

            title = _safe_extract_text(res, "title", "Unknown")
            body = _safe_extract_text(res, "body", "Found via web search")

            real_pois.append(
                {
                    "name_en": title,
                    "description_en": body,
                    "lat": loc_lat,
                    "lng": loc_lng,
                    "id": _safe_web_poi_id(title),
                    "category": "activity",
                }
            )

        if real_pois:
            return real_pois

    except Exception as e:
        logger.warning(f"Web search failed: {e}, falling back to Mock/Nominatim")

    # 2) Fallback: MockDataService nearby
    if location is not None:
        try:
            pois = _call_get_pois_nearby(float(location.lat), float(location.lng), float(radius_km))
            # Optional text filter
            ql = q.lower()
            filtered = []
            for p in pois:
                try:
                    name = (p.name_en or "").lower()
                    desc = (getattr(p, "description_en", "") or "").lower()
                    if ql in name or (desc and ql in desc):
                        filtered.append(p)
                except Exception:
                    continue
            return [p.dict() for p in filtered]
        except Exception as e:
            logger.error(f"Mock POI search failed: {e}")

    # 3) Fallback: Nominatim search
    try:
        results = await _call_nominatim_search(q, limit=3)
        out: List[Dict[str, Any]] = []
        for r in results:
            try:
                out.append(r.dict())
            except Exception:
                if isinstance(r, dict):
                    out.append(r)
        return out
    except Exception as e:
        logger.error(f"Nominatim search failed: {e}")
        return []


async def get_route_info(
    origin: Location,
    destination: Location,
    mode: TravelMode = TravelMode.WALK
) -> Dict[str, Any]:
    """Get routing information (distance, duration) between two points."""
    dist_km = calculate_distance_km(origin, destination)
    duration_min = estimate_travel_time_min(dist_km, mode)
    return {
        "distance_km": round(dist_km, 2),
        "duration_min": duration_min,
        "mode": getattr(mode, "value", str(mode)),
    }


async def search_accommodation(location: Location, radius_km: float = 5.0, type_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Search for accommodation using Failte Ireland data (via failte_service)."""
    try:
        try:
            from .services.failte_service import get_accommodation_near
        except ImportError:
            from services.failte_service import get_accommodation_near
        results = await get_accommodation_near(location, radius_km, type_filter)
        return [acc.dict() for acc in results]
    except Exception as e:
        logger.error(f"search_accommodation failed: {e}")
        return []

async def search_events(location: Location, date_range: Optional[str] = None) -> List[Dict[str, Any]]:
    """Search for events using Failte Ireland data (via failte_service)."""
    try:
        try:
            from .services.failte_service import get_events_near
        except ImportError:
            from services.failte_service import get_events_near
        results = await get_events_near(location)
        return [evt.dict() for evt in results]
    except Exception as e:
        logger.error(f"search_events failed: {e}")
        return []


TOOLS_DEFINITION = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get REAL-TIME weather conditions (temp, rain, wind) for lat/lng",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number", "description": "Latitude"},
                    "lng": {"type": "number", "description": "Longitude"},
                },
                "required": ["lat", "lng"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_pois",
            "description": "Search for POIs, Events, or Live Venue info using Web Search",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "What to find (e.g. 'live music', 'open museums')"},
                    "lat": {"type": "number", "description": "Latitude"},
                    "lng": {"type": "number", "description": "Longitude"},
                    "radius_km": {"type": "number", "description": "Search radius"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_route_info",
            "description": "Calculate distance and time between checks",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin_lat": {"type": "number"},
                    "origin_lng": {"type": "number"},
                    "dest_lat": {"type": "number"},
                    "dest_lng": {"type": "number"},
                    "mode": {"type": "string", "enum": ["walk", "car", "public_transport"]},
                },
                "required": ["origin_lat", "origin_lng", "dest_lat", "dest_lng"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_accommodation",
            "description": "Find hotels, B&Bs, or hostels near a location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number"},
                    "lng": {"type": "number"},
                    "radius_km": {"type": "number", "default": 5.0},
                    "type": {"type": "string", "description": "Type of accommodation (Hotel, B&B, Hostel, Camping)"},
                },
                "required": ["lat", "lng"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_upcoming_events",
            "description": "Get upcoming events and festivals near a location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number"},
                    "lng": {"type": "number"},
                    "date": {"type": "string", "description": "Optional ISO date"},
                },
                "required": ["lat", "lng"],
            },
        },
    },
]


