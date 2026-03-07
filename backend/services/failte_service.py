import os
import logging
import asyncio
import pandas as pd
import httpx
from typing import List, Optional
from datetime import datetime, timedelta
try:
    from backend.models import Accommodation, Event, Activity, Location
    from backend.database import db
    from backend.utils import calculate_distance_km
except ImportError:
    from ..models import Accommodation, Event, Activity, Location  # type: ignore
    from ..database import db  # type: ignore
    from ..utils import calculate_distance_km  # type: ignore

logger = logging.getLogger(__name__)

# Replace these with actual CSV download URLs from data.gov.ie
FAILTE_DATA_URLS = {
    "accommodation": os.getenv("FAILTE_ACCOMMODATION_CSV_URL", "https://failteireland.azure-api.net/opendata-api/v2/accommodation/csv"),
    "events": os.getenv("FAILTE_EVENTS_CSV_URL", "https://failteireland.azure-api.net/opendata-api/v2/events/csv"),
    "activities": os.getenv("FAILTE_ACTIVITIES_CSV_URL", "https://failteireland.azure-api.net/opendata-api/v2/attractions/csv")
}

async def sync_all_data():
    """Syncs all Failte Ireland datasets to MongoDB."""
    await sync_accommodation()
    await sync_events()
    await sync_activities()

async def _insert_accommodation(df: pd.DataFrame):
    """Parses and inserts accommodation data from DataFrame."""
    ops = []
    count = 0
    for _, row in df.iterrows():
        try:
            lat = float(row.get("Latitude", 0))
            lng = float(row.get("Longitude", 0))
            if lat == 0 or lng == 0: continue
            
            acc = Accommodation(
                name=str(row.get("Account Name", "Unknown")),
                type=str(row.get("Sector", "Hotel")),
                location=Location(lat=lat, lng=lng),
                address=f"{str(row.get('Address Line 1', ''))}, {str(row.get('Address City/Town', ''))}",
                rating=str(row.get("Rating", "")),
                amenities=[], # Not provided in CSV directly or needs parsing
                tags=[str(row.get("Address County", ""))]
            )
            # Upsert
            await db.accommodation.update_one(
                {"name": acc.name},
                {"$set": acc.dict()},
                upsert=True
            )
            count += 1
        except Exception:
            continue
    logger.info(f"Inserted/Updated {count} accommodation records.")

async def _insert_events(df: pd.DataFrame):
    """Parses and inserts event data from DataFrame."""
    count = 0
    for _, row in df.iterrows():
        try:
            lat = float(row.get("Latitude", 0))
            lng = float(row.get("Longitude", 0))
            if lat == 0 or lng == 0: continue
            
            evt = Event(
                name=str(row.get("Name", "Unknown")),
                description=str(row.get("Description", "")),
                location=Location(lat=lat, lng=lng),
                start_date=str(row.get("Start Date", "")),
                end_date=str(row.get("End Date", "")),
                tags=[str(row.get("Event Type", "")), str(row.get("County", ""))]
            )
            await db.events.update_one(
                {"name": evt.name},
                {"$set": evt.dict()},
                upsert=True
            )
            count += 1
        except Exception:
            continue
    logger.info(f"Inserted/Updated {count} event records.")

async def _insert_activities(df: pd.DataFrame):
    """Parses and inserts activity/attraction data from DataFrame."""
    count = 0
    for _, row in df.iterrows():
        try:
            lat = float(row.get("Latitude", 0))
            lng = float(row.get("Longitude", 0))
            if lat == 0 or lng == 0: continue
            
            act = Activity(
                name=str(row.get("Name", "Unknown")),
                website=str(row.get("Url", "")),
                telephone=str(row.get("Telephone", "")),
                location=Location(lat=lat, lng=lng),
                address=str(row.get("Address", "")),
                type="Attraction",
                image_url=str(row.get("Photo", "")),
                tags=[t.strip() for t in str(row.get("Tags", "")).split(",") if t.strip()]
            )
            await db.activities.update_one(
                {"name": act.name},
                {"$set": act.dict()},
                upsert=True
            )
            count += 1
        except Exception:
            continue
    logger.info(f"Inserted/Updated {count} activity records.")

async def sync_accommodation():
    url = FAILTE_DATA_URLS["accommodation"]
    logger.info(f"Syncing accommodation from {url}...")
    try:
        df = pd.read_csv(url)
        logger.info(f"Loaded {len(df)} rows. Inserting to DB...")
        await _insert_accommodation(df)
    except Exception as e:
        logger.warning(f"Failed to sync accommodation: {e}")
        await _insert_mock_accommodation()

async def sync_events():
    url = FAILTE_DATA_URLS["events"]
    logger.info(f"Syncing events from {url}...")
    try:
        df = pd.read_csv(url)
        logger.info(f"Loaded {len(df)} rows. Inserting to DB...")
        await _insert_events(df)
    except Exception as e:
        logger.warning(f"Failed to sync events: {e}")
        await _insert_mock_events()

async def sync_activities():
    url = FAILTE_DATA_URLS["activities"]
    logger.info(f"Syncing activities from {url}...")
    try:
        df = pd.read_csv(url)
        logger.info(f"Loaded {len(df)} rows. Inserting to DB...")
        await _insert_activities(df)
    except Exception as e:
        logger.warning(f"Failed to sync activities: {e}")

async def _insert_mock_accommodation():
    """Inserts mock accommodation data for testing."""
    # ... kept for fallback ...
    pass

async def _insert_mock_events():
    pass

# --- Search Functions ---

async def get_accommodation_near(location: Location, radius_km: float = 5.0, type_filter: Optional[str] = None) -> List[Accommodation]:
    """Finds accommodation near a location using MongoDB geospatial query."""
    query = {
        "location.lat": {"$gte": location.lat - 0.5, "$lte": location.lat + 0.5}, # Rough box
        "location.lng": {"$gte": location.lng - 0.5, "$lte": location.lng + 0.5}
    }
    if type_filter:
        query["type"] = {"$regex": type_filter, "$options": "i"}
        
    cursor = db.accommodation.find(query)
    results = []
    async for doc in cursor:
        acc = Accommodation(**doc)
        dist = calculate_distance_km(location, acc.location)
        if dist <= radius_km:
            results.append(acc)
            
    return sorted(results, key=lambda x: calculate_distance_km(location, x.location))

async def get_events_near(location: Location, start_date: Optional[str] = None, days: int = 7) -> List[Event]:
    """Finds upcoming events near a location."""
    # Simplified date logic for demo
    cursor = db.events.find({})
    results = []
    async for doc in cursor:
        evt = Event(**doc)
        dist = calculate_distance_km(location, evt.location)
        if dist <= 20.0: # Wider radius for events
            results.append(evt)
    return results

async def get_activities_near(location: Location, radius_km: float = 5.0) -> List[Activity]:
    """Finds activities/attractions near a location."""
    query = {
        "location.lat": {"$gte": location.lat - 0.5, "$lte": location.lat + 0.5},
        "location.lng": {"$gte": location.lng - 0.5, "$lte": location.lng + 0.5}
    }
    try:
        # Wrap DB calls with a short timeout (2s) to fail fast if Mongo is not running
        # NOTE: db.activities.find() returns a cursor immediately. The actual I/O happens on iteration.
        cursor = db.activities.find(query)
        results = []
        async for doc in cursor: 
             try:
                act = Activity(**doc)
                dist = calculate_distance_km(location, act.location)
                if dist <= radius_km:
                    results.append(act)
             except Exception:
                continue
        return sorted(results, key=lambda x: calculate_distance_km(location, x.location))
    except Exception as e:
        logger.warning(f"Failte DB query failed/timed out: {e}")
        return []
