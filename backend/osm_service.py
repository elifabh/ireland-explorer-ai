"""
OpenStreetMap Overpass API service for fetching real POI data.
No API key required — completely free.
"""
import logging
from typing import List, Optional, Dict, Any

import httpx

from backend.models import POI, Location, Interest

logger = logging.getLogger(__name__)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Map OSM tags to our Interest enum
OSM_TAG_TO_INTEREST: Dict[str, Interest] = {
    # tourism
    "museum": Interest.MUSEUMS,
    "gallery": Interest.MUSEUMS,
    "artwork": Interest.MUSEUMS,
    "attraction": Interest.HISTORY,
    "viewpoint": Interest.VIEWPOINTS,
    "picnic_site": Interest.NATURE,
    "theme_park": Interest.MUSEUMS,
    "zoo": Interest.NATURE,
    # historic
    "castle": Interest.HISTORY,
    "monument": Interest.HISTORY,
    "memorial": Interest.HISTORY,
    "ruins": Interest.HISTORY,
    "archaeological_site": Interest.HISTORY,
    "fort": Interest.HISTORY,
    "church": Interest.HISTORY,
    "cathedral": Interest.HISTORY,
    "abbey": Interest.HISTORY,
    "manor": Interest.HISTORY,
    "tower": Interest.HISTORY,
    "city_gate": Interest.HISTORY,
    "battlefield": Interest.HISTORY,
    # leisure
    "park": Interest.NATURE,
    "garden": Interest.NATURE,
    "nature_reserve": Interest.NATURE,
    "bird_hide": Interest.NATURE,
    "playground": Interest.NATURE,
    # amenity
    "place_of_worship": Interest.HISTORY,
    "theatre": Interest.MUSEUMS,
    "library": Interest.MUSEUMS,
    "arts_centre": Interest.MUSEUMS,
}


def _build_overpass_query(lat: float, lng: float, radius_m: int = 5000) -> str:
    """Build an Overpass QL query to find tourism/historic/leisure POIs near a point."""
    return f"""
[out:json][timeout:15];
(
  node["tourism"~"museum|gallery|attraction|viewpoint|artwork|picnic_site|zoo"](around:{radius_m},{lat},{lng});
  node["historic"~"castle|monument|memorial|ruins|archaeological_site|fort|church|cathedral|abbey|tower"](around:{radius_m},{lat},{lng});
  node["leisure"~"park|garden|nature_reserve"](around:{radius_m},{lat},{lng});
  way["tourism"~"museum|gallery|attraction|viewpoint|zoo"](around:{radius_m},{lat},{lng});
  way["historic"~"castle|monument|memorial|ruins|fort|cathedral|abbey"](around:{radius_m},{lat},{lng});
  way["leisure"~"park|garden|nature_reserve"](around:{radius_m},{lat},{lng});
);
out center tags 50;
"""


def _determine_categories(tags: Dict[str, str]) -> List[Interest]:
    """Determine Interest categories from OSM tags."""
    cats: List[Interest] = []
    seen = set()

    for tag_key in ["tourism", "historic", "leisure", "amenity"]:
        val = tags.get(tag_key, "")
        if val and val in OSM_TAG_TO_INTEREST:
            interest = OSM_TAG_TO_INTEREST[val]
            if interest not in seen:
                cats.append(interest)
                seen.add(interest)

    # Default if nothing matched
    if not cats:
        cats.append(Interest.HISTORY)

    return cats


def _element_to_poi(element: Dict[str, Any], index: int) -> Optional[POI]:
    """Convert an Overpass element to our POI model."""
    tags = element.get("tags", {})
    name = tags.get("name:en") or tags.get("name") or tags.get("name:ga")
    if not name:
        return None

    # Get coordinates (node has lat/lon directly, way/relation have center)
    lat = element.get("lat") or (element.get("center", {}) or {}).get("lat")
    lng = element.get("lon") or (element.get("center", {}) or {}).get("lon")
    if not lat or not lng:
        return None

    categories = _determine_categories(tags)
    name_ga = tags.get("name:ga", "")
    description = tags.get("description:en") or tags.get("description") or ""

    # Try to get entry fee info
    fee_str = tags.get("fee", "no")
    entry_fee = 0.0
    if fee_str == "yes" and "charge" in tags:
        try:
            entry_fee = float(tags["charge"].replace("€", "").replace(",", ".").strip())
        except (ValueError, TypeError):
            entry_fee = 5.0  # Assume moderate fee if marked as paid
    elif fee_str == "yes":
        entry_fee = 5.0

    wheelchair = tags.get("wheelchair", "unknown")
    wheelchair_accessible = wheelchair in ("yes", "limited")

    opening_hours = tags.get("opening_hours", "")

    osm_id = str(element.get("id", index))
    poi_id = f"osm-{element.get('type', 'node')}-{osm_id}"

    return POI(
        id=poi_id,
        name_en=name,
        name_ga=name_ga or "",
        description_en=description or f"A {categories[0].value} attraction in Ireland.",
        description_ga="",
        location=Location(lat=float(lat), lng=float(lng)),
        categories=categories,
        opening_hours=opening_hours,
        entry_fee=entry_fee,
        wheelchair_accessible=wheelchair_accessible,
    )


async def fetch_pois_nearby(
    lat: float,
    lng: float,
    radius_m: int = 5000,
    interests: Optional[List[Interest]] = None,
    max_results: int = 30,
) -> List[POI]:
    """
    Fetch real POIs from OpenStreetMap Overpass API.

    Args:
        lat: Latitude
        lng: Longitude
        radius_m: Search radius in meters (default 5km)
        interests: Optional filter by Interest categories
        max_results: Max number of POIs to return

    Returns:
        List of POI objects from OSM data
    """
    query = _build_overpass_query(lat, lng, radius_m)

    timeout = httpx.Timeout(20.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"Overpass API request failed: {e}")
            return []

    elements = data.get("elements", [])
    logger.info(f"Overpass returned {len(elements)} raw elements for ({lat}, {lng})")

    pois: List[POI] = []
    seen_names: set = set()

    for i, element in enumerate(elements):
        poi = _element_to_poi(element, i)
        if poi is None:
            continue

        # Deduplicate by name
        name_lower = poi.name_en.lower()
        if name_lower in seen_names:
            continue
        seen_names.add(name_lower)

        # Filter by interests if specified
        if interests:
            if not any(cat in interests for cat in poi.categories):
                continue

        pois.append(poi)
        if len(pois) >= max_results:
            break

    logger.info(f"Overpass yielded {len(pois)} POIs after filtering for ({lat}, {lng})")
    return pois
