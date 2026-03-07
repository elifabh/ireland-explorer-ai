from math import radians, sin, cos, sqrt, atan2
from typing import Optional, Any, Union
import re
from datetime import datetime, time as dtime

try:
    from .models import Location, TravelMode, TimePreset  # type: ignore
except ImportError:
    from models import Location, TravelMode, TimePreset  # type: ignore


def get_llm_client() -> Optional[Any]:
    # Stub: agents.py içinde LLMClient direkt kullanıldığı için burada None yeterli
    return None


def get_time_budget_minutes(preset: Union[TimePreset, str]) -> int:
    """Convert time preset to minutes."""
    p = getattr(preset, "value", preset)

    mapping = {
        "30m": 30,
        "60m": 60,
        "90m": 90,
        "2h": 120,
        "4h": 240,
        "1d": 480,
        "1day": 480,
        "one_day": 480,
    }

    if isinstance(p, str):
        return mapping.get(p, 60)

    # preset gerçekten enum objesi ise fallback
    enum_mapping = {
        TimePreset.THIRTY_MIN: 30,
        TimePreset.SIXTY_MIN: 60,
        TimePreset.NINETY_MIN: 90,
        TimePreset.TWO_HOURS: 120,
        TimePreset.FOUR_HOURS: 240,
        TimePreset.ONE_DAY: 480,
    }
    return enum_mapping.get(preset, 60)


def calculate_distance_km(loc1: Location, loc2: Location) -> float:
    """Calculate approximate distance between two points in km."""
    R = 6371
    lat1, lon1 = radians(loc1.lat), radians(loc1.lng)
    lat2, lon2 = radians(loc2.lat), radians(loc2.lng)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


def estimate_travel_time_min(distance_km: float, mode: Union[TravelMode, str]) -> int:
    """Estimate travel time based on distance and mode."""
    # mode string geldiyse enum'a çevir
    if isinstance(mode, str):
        try:
            mode = TravelMode(mode)
        except Exception:
            mode = TravelMode.WALK

    speeds_kmh = {
        TravelMode.WALK: 5,
        TravelMode.PUBLIC_TRANSPORT: 20,
        TravelMode.CAR: 60,
    }
    speed = speeds_kmh.get(mode, 5)
    return max(1, int((distance_km / speed) * 60))


# ============================================================
# OSM Opening Hours Parser
# ============================================================

# Day abbreviation -> weekday index (Monday=0)
_DAY_INDEX = {
    "mo": 0, "tu": 1, "we": 2, "th": 3, "fr": 4, "sa": 5, "su": 6,
}

def _parse_time(t: str) -> Optional[dtime]:
    """Parse 'HH:MM' into a time object."""
    try:
        h, m = t.strip().split(":")
        return dtime(int(h), int(m))
    except Exception:
        return None


def _day_range_to_indices(day_expr: str) -> list[int]:
    """
    Convert a day expression like 'Mo-Fr', 'Sa', 'Mo-Su' to a list of weekday indices.
    """
    day_expr = day_expr.strip().lower()
    if "-" in day_expr:
        parts = day_expr.split("-")
        start = _DAY_INDEX.get(parts[0].strip())
        end = _DAY_INDEX.get(parts[1].strip())
        if start is None or end is None:
            return []
        if end >= start:
            return list(range(start, end + 1))
        else:
            # Wraps around (e.g. Fr-Mo) — rare but handle it
            return list(range(start, 7)) + list(range(0, end + 1))
    else:
        idx = _DAY_INDEX.get(day_expr)
        return [idx] if idx is not None else []


def is_open_at(opening_hours: Optional[str], when: Optional[datetime] = None) -> Optional[bool]:
    """
    Check if a place is open at a given datetime based on its OSM opening_hours string.

    Returns:
        True  → definitely open
        False → definitely closed
        None  → unknown (no data or unparseable) — caller should NOT filter out

    Handles common OSM formats:
      - "Mo-Fr 09:00-17:00"
      - "Mo-Sa 10:00-18:00; Su 12:00-16:00"
      - "24/7"
      - "Mo-Fr 09:00-17:00; Sa-Su off"
      - "Tu-Sa 10:00-17:00; Su 13:00-17:00"
      - "off" (permanently closed)
    """
    if not opening_hours:
        return None  # No data → don't exclude

    oh = opening_hours.strip()

    if oh == "24/7":
        return True

    if oh.lower() in ("off", "closed"):
        return False

    if when is None:
        when = datetime.now()

    weekday = when.weekday()  # 0=Monday … 6=Sunday
    current_time = when.time()

    # Split into rules by ";"
    rules = [r.strip() for r in oh.split(";") if r.strip()]

    matched_open = None  # Track if any matching rule says open/closed

    for rule in rules:
        rule = rule.strip()
        if not rule:
            continue

        # Check for "off" suffix
        is_off = rule.lower().endswith(" off") or rule.lower() == "off"
        rule_body = re.sub(r"\boff\b", "", rule, flags=re.IGNORECASE).strip()

        # Try to parse: "DAY_EXPR HH:MM-HH:MM"
        # Pattern: optional day part, then time range
        m = re.match(
            r"^([A-Za-z,\-\s]+?)\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$",
            rule_body
        )
        if not m:
            # Maybe it's just a day with "off" and no time: "Su off"
            if is_off:
                day_part = re.sub(r"\boff\b", "", rule, flags=re.IGNORECASE).strip()
                indices = _day_range_to_indices(day_part)
                if weekday in indices:
                    return False  # Explicitly closed today
            continue

        day_part = m.group(1).strip()
        open_time = _parse_time(m.group(2))
        close_time = _parse_time(m.group(3))

        if open_time is None or close_time is None:
            continue

        # Handle comma-separated days: "Mo,We,Fr"
        indices: list[int] = []
        for segment in day_part.split(","):
            indices.extend(_day_range_to_indices(segment))

        if weekday not in indices:
            continue  # This rule doesn't apply to today

        if is_off:
            return False  # Rule explicitly closes today

        # Check time window
        if open_time <= close_time:
            # Normal window e.g. 09:00-17:00
            is_in_window = open_time <= current_time < close_time
        else:
            # Overnight e.g. 22:00-02:00
            is_in_window = current_time >= open_time or current_time < close_time

        matched_open = is_in_window

    if matched_open is None:
        # No matching rule found for today → unknown
        return None

    return matched_open

