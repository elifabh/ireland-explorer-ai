# real_tools.py
from __future__ import annotations

import asyncio
import logging
from typing import List, Dict, Any, Optional

import httpx
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)


def _ddg_text_search_sync(query: str, max_results: int) -> List[Dict[str, Any]]:
    """
    duckduckgo_search is synchronous and can block the event loop.
    Run it in a thread via asyncio.to_thread.
    """
    out: List[Dict[str, Any]] = []
    try:
        with DDGS() as ddgs:
            # ddgs.text(...) returns an iterator/generator
            for item in ddgs.text(query, max_results=max_results):
                if not isinstance(item, dict):
                    continue
                out.append(item)
    except Exception as e:
        logger.error(f"DDG search failed: {e}")
    return out


async def google_search(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Performs a web search using DuckDuckGo.
    Returns normalized results with keys:
      - title
      - href
      - body
    """
    try:
        raw = await asyncio.to_thread(_ddg_text_search_sync, query, max_results)
        normalized: List[Dict[str, Any]] = []
        for r in raw:
            normalized.append(
                {
                    "title": r.get("title") or r.get("heading") or "Unknown",
                    "href": r.get("href") or r.get("url") or "",
                    "body": r.get("body") or r.get("snippet") or "",
                }
            )
        return normalized
    except Exception as e:
        logger.error(f"Search wrapper failed: {e}")
        return []


def _wmo_condition(wmo_code: int) -> str:
    if wmo_code == 0:
        return "Clear sky"
    if wmo_code in (1, 2, 3):
        return "Partly cloudy"
    if wmo_code in (45, 48):
        return "Foggy"
    if wmo_code in (51, 53, 55):
        return "Drizzle"
    if wmo_code in (61, 63, 65):
        return "Rain"
    if wmo_code in (71, 73, 75):
        return "Snow"
    if wmo_code in (80, 81, 82):
        return "Rain showers"
    if wmo_code in (95, 96, 99):
        return "Thunderstorm"
    return "Unknown"


async def get_real_weather(lat: float, lng: float) -> Dict[str, Any]:
    """
    Fetches real weather data from Open-Meteo (no key).
    Returns keys compatible with WeatherSummary:
      - temperature_c
      - condition
      - condition_ga (optional, set to fallback)
      - wind_speed_kmh
      - precipitation_chance (0..1)
      - warnings (list)
    """
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lng}"
        "&current=temperature_2m,weather_code,wind_speed_10m"
        "&hourly=precipitation_probability"
        "&forecast_days=1"
    )

    timeout = httpx.Timeout(10.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

            current = data.get("current") or {}
            hourly = data.get("hourly") or {}
            precip_probs = hourly.get("precipitation_probability") or []

            wmo_code = int(current.get("weather_code", -1))
            condition = _wmo_condition(wmo_code)

            precip_0_24 = precip_probs[:24] if isinstance(precip_probs, list) else []
            precip_max = max(precip_0_24) if precip_0_24 else 0
            precip_chance = float(precip_max) / 100.0

            return {
                "temperature_c": float(current.get("temperature_2m", 0.0)),
                "condition": condition,
                "condition_ga": "Aimsir",
                "wind_speed_kmh": float(current.get("wind_speed_10m", 0.0)),
                "precipitation_chance": max(0.0, min(1.0, precip_chance)),
                "warnings": [],
                "source": "open-meteo",
            }
        except Exception as e:
            logger.error(f"Weather API failed: {e}")
            return {
                "temperature_c": 12.0,
                "condition": "Cloudy (Offline)",
                "condition_ga": "Aimsir",
                "wind_speed_kmh": 15.0,
                "precipitation_chance": 0.2,
                "warnings": ["Weather data unavailable"],
                "source": "fallback",
            }


async def find_events_nearby(lat: float, lng: float) -> List[Dict[str, Any]]:
    """
    Finds events near coordinates using web search (unstructured).
    Returns items with keys:
      - name
      - location
      - date
      - category
      - url
    """
    query = f"events near {lat},{lng} today"
    search_results = await google_search(query, max_results=5)

    events: List[Dict[str, Any]] = []
    for res in search_results:
        title = res.get("title") or "Unknown"
        href = res.get("href") or ""
        events.append(
            {
                "name": title,
                "location": "Nearby",
                "date": "Today",
                "category": "mixed",
                "url": href,
            }
        )
    return events
