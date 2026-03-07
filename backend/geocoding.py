"""Geocoding service using OpenStreetMap Nominatim.

Follows Nominatim usage policy:
- Valid User-Agent header
- Rate limiting (max 1 request/second)
- Aggressive caching (24 hours)
"""
import os
import asyncio
import aiohttp
import hashlib
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Configuration
NOMINATIM_URL = os.environ.get("NOMINATIM_URL", "https://nominatim.openstreetmap.org").rstrip("/")
USER_AGENT = os.environ.get("NOMINATIM_USER_AGENT", "IrelandExplorerApp/2.0 (travel-app@ireland-explorer.app)")
CACHE_TTL_HOURS = int(os.environ.get("GEO_CACHE_TTL_HOURS", "24"))
RATE_LIMIT_SECONDS = float(os.environ.get("GEO_RATE_LIMIT_SECONDS", "1.0"))


@dataclass
class GeoResult:
    """Geocoding result."""
    label: str
    lat: float
    lng: float
    source: str = "nominatim"
    place_id: Optional[str] = None
    osm_type: Optional[str] = None
    osm_id: Optional[str] = None
    address_details: Optional[Dict[str, Any]] = None  # FIX: Nominatim values are not guaranteed str


class GeoCache:
    """
    Simple in-memory cache for geocoding results.
    In production, replace with Redis for distributed caching.
    """

    def __init__(self, ttl_hours: int = CACHE_TTL_HOURS):
        self.ttl = timedelta(hours=ttl_hours)
        self._cache: Dict[str, tuple[Any, datetime]] = {}

    def _make_key(self, prefix: str, *args: Any) -> str:
        """Create a cache key from arguments."""
        key_str = f"{prefix}:" + ":".join(str(a) for a in args)
        return hashlib.md5(key_str.encode("utf-8")).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        item = self._cache.get(key)
        if not item:
            return None
        value, timestamp = item
        if datetime.utcnow() - timestamp < self.ttl:
            return value
        # expired
        try:
            del self._cache[key]
        except KeyError:
            pass
        return None

    def set(self, key: str, value: Any) -> None:
        """Set value in cache."""
        self._cache[key] = (value, datetime.utcnow())

    def clear_expired(self) -> None:
        """Remove expired entries."""
        now = datetime.utcnow()
        expired = [k for k, (_, ts) in self._cache.items() if now - ts >= self.ttl]
        for k in expired:
            try:
                del self._cache[k]
            except KeyError:
                pass


class RateLimiter:
    """
    Simple rate limiter for Nominatim API.
    Ensures minimum delay between requests.
    """

    def __init__(self, min_interval: float = RATE_LIMIT_SECONDS):
        self.min_interval = min_interval
        self._last_request: Optional[datetime] = None
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Wait if necessary to respect rate limit."""
        async with self._lock:
            if self._last_request:
                elapsed = (datetime.utcnow() - self._last_request).total_seconds()
                if elapsed < self.min_interval:
                    await asyncio.sleep(self.min_interval - elapsed)
            self._last_request = datetime.utcnow()


class GeocodingService:
    """
    Geocoding service using OpenStreetMap Nominatim.

    Provides:
    - Forward geocoding (search query -> coordinates)
    - Reverse geocoding (coordinates -> address label)

    Features:
    - Rate limiting to comply with Nominatim usage policy
    - Aggressive caching to minimize API calls
    - Ireland-focused results
    """

    def __init__(self):
        self.cache = GeoCache()
        self.rate_limiter = RateLimiter()
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        }
        self._session: Optional[aiohttp.ClientSession] = None
        self._session_lock = asyncio.Lock()

    async def _get_session(self) -> aiohttp.ClientSession:
        """Lazy-init a shared aiohttp session."""
        if self._session and not self._session.closed:
            return self._session
        async with self._session_lock:
            if self._session and not self._session.closed:
                return self._session
            self._session = aiohttp.ClientSession(headers=self.headers)
            return self._session

    async def close(self) -> None:
        """Close the shared aiohttp session (call on app shutdown)."""
        if self._session and not self._session.closed:
            await self._session.close()

    async def search(self, query: str, country: str = "IE", limit: int = 5) -> List[GeoResult]:
        """
        Forward geocoding: search for places by name/address.
        """
        if not query or len(query.strip()) < 2:
            return []

        query_norm = query.strip().lower()
        country_norm = (country or "IE").strip().lower()

        # clamp limit
        if limit < 1:
            limit = 1
        if limit > 10:
            limit = 10

        cache_key = self.cache._make_key("search", query_norm, country_norm, limit)

        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        await self.rate_limiter.acquire()

        try:
            session = await self._get_session()
            params = {
                "q": query_norm,
                "format": "json",
                "addressdetails": "1",
                "limit": str(limit),
                "countrycodes": country_norm,
            }

            async with session.get(
                f"{NOMINATIM_URL}/search",
                params=params,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                if response.status != 200:
                    logger.error(f"Nominatim search error: {response.status}")
                    return []
                data = await response.json()

            results: List[GeoResult] = []
            for item in data or []:
                try:
                    results.append(
                        GeoResult(
                            label=item.get("display_name", "") or "",
                            lat=float(item.get("lat", 0) or 0),
                            lng=float(item.get("lon", 0) or 0),
                            source="nominatim",
                            place_id=str(item.get("place_id", "") or ""),
                            osm_type=item.get("osm_type"),
                            osm_id=str(item.get("osm_id", "") or ""),
                            address_details=item.get("address"),
                        )
                    )
                except Exception:
                    # Skip bad row instead of failing whole response
                    continue

            self.cache.set(cache_key, results)
            logger.info(f"Geocode search for '{query_norm}': {len(results)} results")
            return results

        except asyncio.TimeoutError:
            logger.error("Nominatim search timeout")
            return []
        except Exception as e:
            logger.error(f"Nominatim search error: {e}")
            return []

    async def reverse(self, lat: float, lng: float) -> Optional[GeoResult]:
        """
        Reverse geocoding: get address label from coordinates.
        """
        lat_rounded = round(float(lat), 5)
        lng_rounded = round(float(lng), 5)

        cache_key = self.cache._make_key("reverse", lat_rounded, lng_rounded)

        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        await self.rate_limiter.acquire()

        try:
            session = await self._get_session()
            params = {
                "lat": str(lat_rounded),
                "lon": str(lng_rounded),
                "format": "json",
                "addressdetails": "1",
            }

            async with session.get(
                f"{NOMINATIM_URL}/reverse",
                params=params,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                if response.status != 200:
                    logger.error(f"Nominatim reverse error: {response.status}")
                    return None
                data = await response.json()

            if not data or "error" in data:
                return None

            result = GeoResult(
                label=data.get("display_name", "") or "",
                lat=float(data.get("lat", lat_rounded) or lat_rounded),
                lng=float(data.get("lon", lng_rounded) or lng_rounded),
                source="nominatim",
                place_id=str(data.get("place_id", "") or ""),
                osm_type=data.get("osm_type"),
                osm_id=str(data.get("osm_id", "") or ""),
                address_details=data.get("address"),
            )

            self.cache.set(cache_key, result)
            logger.info(f"Reverse geocode for ({lat_rounded}, {lng_rounded}): {result.label[:50]}...")
            return result

        except asyncio.TimeoutError:
            logger.error("Nominatim reverse timeout")
            return None
        except Exception as e:
            logger.error(f"Nominatim reverse error: {e}")
            return None

    def format_short_label(self, result: GeoResult) -> str:
        """
        Create a shorter, more readable label from address details.
        """
        if not result.address_details:
            parts = result.label.split(", ")
            return ", ".join(parts[:3]) if len(parts) > 3 else result.label

        addr = result.address_details
        parts: List[str] = []

        for key in ["road", "pedestrian", "neighbourhood", "suburb", "city", "town", "village", "county"]:
            val = addr.get(key)
            if val:
                parts.append(str(val))
                if len(parts) >= 3:
                    break

        if not parts:
            parts = result.label.split(", ")[:3]

        return ", ".join(parts)


# Global instance
geocoding_service = GeocodingService()


# Ireland-specific popular locations for quick selection
IRELAND_POPULAR_LOCATIONS = [
    GeoResult(label="Dublin City Centre, Dublin, Ireland", lat=53.3498, lng=-6.2603, source="preset"),
    GeoResult(label="Cork City, Cork, Ireland", lat=51.8985, lng=-8.4756, source="preset"),
    GeoResult(label="Galway City, Galway, Ireland", lat=53.2707, lng=-9.0568, source="preset"),
    GeoResult(label="Limerick City, Limerick, Ireland", lat=52.6638, lng=-8.6267, source="preset"),
    GeoResult(label="Killarney, Kerry, Ireland", lat=52.0599, lng=-9.5044, source="preset"),
]
