import sys
import os

# Fix module resolution
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from typing import List, Optional, Dict, Any
import asyncio
import hashlib
import logging
from datetime import datetime, timedelta
import random
import math
from cachetools import TTLCache  # type: ignore
from pydantic import BaseModel  # type: ignore
import httpx  # type: ignore

logger = logging.getLogger(__name__)

# Local imports (required for MockDataService)
try:
    from .models import POI, Location, Interest  # type: ignore
except ImportError:
    from models import POI, Location, Interest  # type: ignore

# ============== CACHING ==============
geo_cache = TTLCache(maxsize=1000, ttl=86400)     # 1 day

# Nominatim rate limiter: max 1 request/second (OSM policy)
_last_nominatim_call: float = 0.0
_NOMINATIM_MIN_INTERVAL = 1.1  # seconds


class GeoLocation(BaseModel):
    label: str
    lat: float
    lng: float
    source: str = "nominatim"


# ============== GEOCODING SERVICE ==============
class NominatimService:
    """
    OpenStreetMap Nominatim wrapper with:
    - basic rate limiting
    - TTL cache
    - User-Agent header
    Uses httpx (not aiohttp) for reliable JSON parsing.
    """
    BASE_URL = "https://nominatim.openstreetmap.org"
    USER_AGENT = os.environ.get("NOMINATIM_USER_AGENT", "IrelandTravelApp/1.0 (contact@irelandtravel.app)")

    @staticmethod
    def _get_cache_key(prefix: str, **kwargs) -> str:
        params_str = str(sorted(kwargs.items()))
        return f"{prefix}:{hashlib.md5(params_str.encode('utf-8')).hexdigest()}"

    @staticmethod
    async def _rate_limit():
        global _last_nominatim_call
        import time
        now = time.monotonic()
        elapsed = now - _last_nominatim_call
        wait = _NOMINATIM_MIN_INTERVAL - elapsed
        if wait > 0:
            await asyncio.sleep(wait)
        _last_nominatim_call = time.monotonic()

    @classmethod
    async def search(cls, query: str, country: str = "IE", limit: int = 5) -> List[GeoLocation]:
        cache_key = cls._get_cache_key("search", q=query.lower(), country=country, limit=limit)
        cached = geo_cache.get(cache_key)
        if cached is not None:
            return cached

        await cls._rate_limit()
        params = {
            "q": query,
            "countrycodes": country,
            "limit": limit,
            "format": "json",
            "addressdetails": 1,
        }
        headers = {"User-Agent": cls.USER_AGENT}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(f"{cls.BASE_URL}/search", params=params, headers=headers)
                if response.status_code != 200:
                    logger.error(f"Nominatim search returned status {response.status_code}")
                    return []
                data = response.json()

            results: List[GeoLocation] = [
                GeoLocation(
                    label=item.get("display_name", ""),
                    lat=float(item.get("lat", 0.0)),
                    lng=float(item.get("lon", 0.0)),
                    source="nominatim",
                )
                for item in (data or [])
            ]
            geo_cache[cache_key] = results
            logger.info(f"Geo search completed: '{query}' -> {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Nominatim search exception: {e}")
            return []

    @classmethod
    async def reverse(cls, lat: float, lng: float) -> Optional[GeoLocation]:
        cache_key = cls._get_cache_key("reverse", lat=round(float(lat), 5), lng=round(float(lng), 5))
        cached = geo_cache.get(cache_key)
        if cached is not None:
            return cached

        await cls._rate_limit()
        params = {"lat": lat, "lon": lng, "format": "json", "addressdetails": 1}
        headers = {"User-Agent": cls.USER_AGENT}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(f"{cls.BASE_URL}/reverse", params=params, headers=headers)
                if response.status_code != 200:
                    logger.error(f"Nominatim reverse returned status {response.status_code}")
                    return None
                data = response.json()

            if not data or "error" in data:
                logger.warning(f"Nominatim reverse no result for {lat},{lng}: {data.get('error', 'empty')}")
                return None

            # Build a shorter, friendlier label from address components
            addr = data.get("address", {})
            parts = []
            for key in ("road", "suburb", "town", "city", "county"):
                val = addr.get(key)
                if val:
                    parts.append(val)
                    if len(parts) == 2:
                        break
            label = ", ".join(parts) if parts else data.get("display_name", f"{lat:.4f}, {lng:.4f}")

            result = GeoLocation(
                label=label,
                lat=float(lat),
                lng=float(lng),
                source="nominatim",
            )
            geo_cache[cache_key] = result
            logger.info(f"Geo reverse completed: {lat}, {lng} -> {label}")
            return result

        except Exception as e:
            logger.error(f"Nominatim reverse exception: {e}")
            return None


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ============== MOCK DATA SERVICE ==============
class MockDataService:
    """
    Sistem çalışması için deterministik / sağlam mock katmanı.

    Not:
    - POI modelinde "categories" tipi enum olabilir veya string olabilir.
    - Aşağıdaki filtreler hem enum.value hem string ile çalışır.
    """

    MOCK_POIS: List[POI] = [
        POI(
            id="poi_1",
            name_en="Trinity College Dublin",
            name_ga="Coláiste na Tríonóide",
            description_en="Ireland's oldest university, home to the Book of Kells.",
            location=Location(lat=53.3438, lng=-6.2546),
            categories=[Interest.HISTORY],
            source="mock",
            opening_hours="Mo-Sa 08:30-17:00",
            entry_fee=18.0,
            wheelchair_accessible=True,
        ),
        POI(
            id="poi_2",
            name_en="St. Stephen's Green",
            name_ga="Faiche Stiabhna",
            description_en="Historic Victorian park in the heart of Dublin.",
            location=Location(lat=53.3382, lng=-6.2591),
            categories=[Interest.NATURE],
            source="mock",
            opening_hours="Mo-Su 07:30-dusk",
            entry_fee=0.0,
            wheelchair_accessible=True,
        ),
        POI(
            id="poi_3",
            name_en="National Museum of Ireland",
            name_ga="Ard-Mhúsaem na hÉireann",
            description_en="Treasures of Irish archaeology and history.",
            location=Location(lat=53.3404, lng=-6.2545),
            categories=[Interest.MUSEUMS],
            source="mock",
            opening_hours="Tu-Sa 10:00-17:00; Su 13:00-17:00",
            entry_fee=0.0,
            wheelchair_accessible=True,
        ),
        POI(
            id="poi_4",
            name_en="Dublin Castle",
            name_ga="Caisleán Bhaile Átha Cliath",
            description_en="Historic castle and gardens in the heart of Dublin.",
            location=Location(lat=53.3429, lng=-6.2674),
            categories=[Interest.HISTORY],
            source="mock",
            opening_hours="Mo-Su 09:45-17:15",
            entry_fee=12.0,
            wheelchair_accessible=True,
        ),
        POI(
            id="poi_5",
            name_en="Grafton Street",
            name_ga="Sráid Grafton",
            description_en="Famous pedestrian shopping street with street performers.",
            location=Location(lat=53.3418, lng=-6.2594),
            categories=[Interest.VIEWPOINTS],
            source="mock",
            entry_fee=0.0,
            wheelchair_accessible=True,
        ),
    ]

    @classmethod
    def get_mock_weather(cls, lat: float, lng: float) -> dict:
        conditions = ["Partly cloudy", "Light rain", "Sunny spells", "Overcast", "Clear"]
        return {
            "source": "Met Éireann (mock)",
            "temperature_c": random.randint(8, 18),
            "condition": random.choice(conditions),
            "condition_ga": "Anaithnid",
            "wind_speed_kmh": random.randint(10, 35),
            "wind_direction": random.choice(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
            "precipitation_chance": float(random.uniform(0.1, 0.7)),
            "warnings": [] if random.random() > 0.2 else ["Yellow wind warning in effect"],
        }

    @classmethod
    def get_mock_events(cls, lat: float, lng: float) -> List[dict]:
        return [
            {
                "name": "Traditional Music Session",
                "location": "O'Donoghue's Pub",
                "date": (datetime.utcnow() + timedelta(hours=3)).isoformat(),
                "category": "music",
            },
            {
                "name": "Dublin Food Festival",
                "location": "Temple Bar",
                "date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
                "category": "food",
            },
        ]

    @classmethod
    def get_pois_nearby(
        cls,
        lat: float,
        lng: float,
        radius_km: float = 5.0,
        categories: Optional[List[Any]] = None,   # List[str] or List[Enum]
        budget_free_only: bool = False,
        wheelchair: bool = False,
    ) -> List[POI]:
        # Normalize incoming categories to set[str]
        categories_set: set[str] = set()
        if categories:
            normalized: List[str] = []
            for c in categories:
                if c is None:
                    continue
                normalized.append(str(getattr(c, "value", c)))
            categories_set = set(normalized)

        results: List[POI] = []
        for poi in cls.MOCK_POIS:
            # Distance filter
            d_km = haversine_km(lat, lng, float(poi.location.lat), float(poi.location.lng))
            if d_km > float(radius_km):
                continue

            # Normalize poi categories
            poi_cat_set = set(str(getattr(x, "value", x)) for x in (poi.categories or []))

            # Category filter
            if categories_set and poi_cat_set.isdisjoint(categories_set):
                continue

            # Budget filter
            if budget_free_only and poi.entry_fee and float(poi.entry_fee) > 0:
                continue

            # Accessibility filter
            if wheelchair and not bool(poi.wheelchair_accessible):
                continue

            results.append(poi)

        return results
