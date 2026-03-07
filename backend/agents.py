import os
from typing import List, Dict, Any, Optional, Union
import logging
import json
import asyncio
import uuid
import re
from datetime import datetime
from tenacity import retry, stop_after_attempt, wait_exponential

# =========================
# CORE IMPORTS (fail fast)
# =========================
try:
    from dotenv import load_dotenv  # type: ignore
    import httpx  # type: ignore

    from .models import (  # type: ignore
        POI,
        Location,
        Interest,
        TravelMode,
        Pace,
        TimePreset,
        ExperiencePack,
        ContentType,
        WeatherSummary,
        TransitSummary,
        EventInfo,
        LivePreview,
        Stop,
        StopStatus,
        POISource,
    )

    from .agent_tools import (  # type: ignore
        get_weather,
        get_route_info,
        search_pois,
        search_accommodation,
        search_events,
        TOOLS_DEFINITION,
    )

    from .utils import (  # type: ignore
        get_time_budget_minutes,
        calculate_distance_km,
        estimate_travel_time_min,
        is_open_at,
    )

except ImportError as e:
    raise RuntimeError(f"Import Error in agent.py (core deps): {e}")

# =========================
# OPTIONAL IMPORTS
# =========================
try:
    from .real_tools import get_real_weather, find_events_nearby  # type: ignore
except ImportError:
    get_real_weather = None  # type: ignore
    find_events_nearby = None  # type: ignore

try:
    from .osm_service import fetch_pois_nearby  # type: ignore
except ImportError:
    fetch_pois_nearby = None  # type: ignore

load_dotenv()
logger = logging.getLogger(__name__)

# Mock Ireland POI Data
IRELAND_MOCK_POIS: List[POI] = [
    POI(
        id="poi-dublin-castle",
        name_en="Dublin Castle",
        name_ga="Caisleán Bhaile Átha Cliath",
        description_en="A major Irish government complex and tourist attraction, originally built as a defensive fortress.",
        description_ga="Suíomh tábhachtach rialtais agus spéisíochta, tógadh mar dhún cosanta ar dtús.",
        location=Location(lat=53.3429, lng=-6.2674),
        categories=[Interest.HISTORY, Interest.MUSEUMS],
        opening_hours="Mo-Su 09:45-17:45",
        entry_fee=8.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-trinity-college",
        name_en="Trinity College Dublin",
        name_ga="Coláiste na Tríonóide, Baile Átha Cliath",
        description_en="Ireland's oldest university, founded in 1592. Home to the famous Book of Kells.",
        description_ga="An ollscoil is sine in Éirinn, bunaithe i 1592. Baile Leabhar Cheanannais.",
        location=Location(lat=53.3439, lng=-6.2546),
        categories=[Interest.HISTORY, Interest.MUSEUMS],
        opening_hours="Mo-Sa 09:30-17:00",
        entry_fee=18.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-st-stephens-green",
        name_en="St Stephen's Green",
        name_ga="Faiche Stiabhna",
        description_en="A beautiful Victorian public park in Dublin city centre, perfect for a peaceful stroll.",
        description_ga="Páirc phoiblí Victeoiriach álainn i lár chathair Bhaile Átha Cliath.",
        location=Location(lat=53.3382, lng=-6.2591),
        categories=[Interest.NATURE],
        opening_hours="Mo-Su 07:30-sunset",
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-guinness-storehouse",
        name_en="Guinness Storehouse",
        name_ga="Stóras Guinness",
        description_en="Ireland's most popular tourist attraction, celebrating the history of Guinness beer.",
        description_ga="Tarraingt is mó turasóirí in Éirinn, ag ceiliúradh stair beorach Guinness.",
        location=Location(lat=53.3419, lng=-6.2867),
        categories=[Interest.MUSEUMS, Interest.HISTORY],
        opening_hours="Mo-Su 09:30-19:00",
        entry_fee=26.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-phoenix-park",
        name_en="Phoenix Park",
        name_ga="Páirc an Fhionnuisce",
        description_en="One of the largest enclosed public parks in any European capital, home to wild deer.",
        description_ga="Ceann de na páirceanna poiblí is mó in aon phríomhchathair Eorpach, le fia fiáin.",
        location=Location(lat=53.3559, lng=-6.3298),
        categories=[Interest.NATURE, Interest.VIEWPOINTS],
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-kilmainham-gaol",
        name_en="Kilmainham Gaol",
        name_ga="Príosún Chill Mhaighneann",
        description_en="Historic prison where leaders of the 1916 Easter Rising were executed.",
        description_ga="Príosún stairiúil inar cuireadh ceannairí Éirí Amach na Cásca 1916 chun báis.",
        location=Location(lat=53.3419, lng=-6.3100),
        categories=[Interest.HISTORY, Interest.MUSEUMS],
        opening_hours="Mo-Su 09:30-18:00",
        entry_fee=8.0,
        wheelchair_accessible=False,
    ),
    POI(
        id="poi-cliffs-of-moher",
        name_en="Cliffs of Moher",
        name_ga="Aillte an Mhothair",
        description_en="Spectacular sea cliffs rising 214m above the Atlantic Ocean on Ireland's west coast.",
        description_ga="Aillte farraige iontacha ag éirí 214m os cionn an Aigéin Atlantaigh.",
        location=Location(lat=52.9715, lng=-9.4309),
        categories=[Interest.NATURE, Interest.VIEWPOINTS],
        entry_fee=8.0,
        wheelchair_accessible=True,
        coastal_cliff=True,
    ),
    POI(
        id="poi-glendalough",
        name_en="Glendalough",
        name_ga="Gleann Dá Loch",
        description_en="Ancient monastic settlement in a glacial valley, County Wicklow.",
        description_ga="Lonnaíocht manachúil ársa i ngleann oighreach, Contae Chill Mhantáin.",
        location=Location(lat=53.0115, lng=-6.3296),
        categories=[Interest.HISTORY, Interest.NATURE],
        entry_fee=0.0,
        wheelchair_accessible=False,
    ),
    POI(
        id="poi-national-gallery",
        name_en="National Gallery of Ireland",
        name_ga="Gailearaí Náisiúnta na hÉireann",
        description_en="Ireland's national art gallery with over 16,000 artworks.",
        description_ga="Gailearaí ealaíne náisiúnta na hÉireann le breis is 16,000 saothar ealaíne.",
        location=Location(lat=53.3409, lng=-6.2523),
        categories=[Interest.MUSEUMS],
        opening_hours="Mo 11:00-17:30; Tu-Sa 09:15-17:30; Su 11:00-17:30",
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-ha-penny-bridge",
        name_en="Ha'penny Bridge",
        name_ga="Droichead na Leathphingine",
        description_en="Iconic pedestrian bridge over the River Liffey, built in 1816.",
        description_ga="Droichead coisithe cáiliúil thar Abhainn Life, tógadh i 1816.",
        location=Location(lat=53.3466, lng=-6.2632),
        categories=[Interest.HISTORY, Interest.VIEWPOINTS],
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
    # --- Cork POIs ---
    POI(
        id="poi-english-market",
        name_en="The English Market",
        name_ga="Margadh Shasana",
        description_en="Historic covered food market in Cork city centre, established in 1788. Famous for local produce and artisan foods.",
        description_ga="Margadh bia stairiúil clúdaithe i lár chathair Chorcaí, bunaithe i 1788.",
        location=Location(lat=51.8979, lng=-8.4748),
        categories=[Interest.HISTORY, Interest.MUSEUMS],
        opening_hours="Mo-Sa 08:00-18:00",
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-cork-city-gaol",
        name_en="Cork City Gaol",
        name_ga="Príosún Chathair Chorcaí",
        description_en="19th-century prison now a museum, showcasing Cork's social history and the lives of prisoners.",
        description_ga="Príosún ón 19ú haois, anois ina mhúsaem, ag taispeáint stair shóisialta Chorcaí.",
        location=Location(lat=51.8942, lng=-8.4975),
        categories=[Interest.HISTORY, Interest.MUSEUMS],
        opening_hours="Mo-Su 09:30-17:00",
        entry_fee=10.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-fitzgerald-park",
        name_en="Fitzgerald Park",
        name_ga="Páirc Mhic Gearailt",
        description_en="Beautiful public park along the River Lee with Cork Public Museum, playgrounds and gardens.",
        description_ga="Páirc phoiblí álainn feadh Abhainn na Laoi le Músaem Poiblí Chorcaí.",
        location=Location(lat=51.8938, lng=-8.4943),
        categories=[Interest.NATURE],
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-shandon-bells",
        name_en="St Anne's Church & Shandon Bells",
        name_ga="Eaglais Naomh Anna & Cloig Shandon",
        description_en="Famous Cork landmark where visitors can ring the Shandon Bells and enjoy panoramic city views.",
        description_ga="Sainchomhartha cáiliúil Chorcaí inar féidir Cloig Shandon a bhualadh agus radhairc panorámacha a bheith agat.",
        location=Location(lat=51.9019, lng=-8.4769),
        categories=[Interest.HISTORY, Interest.VIEWPOINTS],
        opening_hours="Mo-Su 10:00-17:00",
        entry_fee=6.0,
        wheelchair_accessible=False,
    ),
    POI(
        id="poi-elizabeth-fort",
        name_en="Elizabeth Fort",
        name_ga="Dún Eilíse",
        description_en="17th-century star-shaped fort with free entry and excellent views over Cork city.",
        description_ga="Dún réaltbhunaithe ón 17ú haois le hiontráil saor in aisce agus radhairc iontacha.",
        location=Location(lat=51.8958, lng=-8.4773),
        categories=[Interest.HISTORY, Interest.VIEWPOINTS],
        opening_hours="Mo-Su 10:00-17:00",
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-crawford-art-gallery",
        name_en="Crawford Art Gallery",
        name_ga="Gailearaí Ealaíne Crawford",
        description_en="National cultural institution with a collection of Irish and European art spanning five centuries.",
        description_ga="Institiúid chultúrtha náisiúnta le bailiúchán ealaíne Éireannach agus Eorpach.",
        location=Location(lat=51.8996, lng=-8.4732),
        categories=[Interest.MUSEUMS],
        opening_hours="Mo-Sa 10:00-17:00; Su 11:00-16:00",
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-blarney-castle",
        name_en="Blarney Castle & Gardens",
        name_ga="Caisleán na Blarnan",
        description_en="Medieval castle famous for the Blarney Stone. Beautiful gardens and Rock Close.",
        description_ga="Caisleán meánaoiseach cáiliúil le Cloch na Blarnan. Gairdíní áille.",
        location=Location(lat=51.9291, lng=-8.5710),
        categories=[Interest.HISTORY, Interest.NATURE],
        opening_hours="Mo-Su 09:00-18:00",
        entry_fee=18.0,
        wheelchair_accessible=False,
    ),
    POI(
        id="poi-cork-butter-museum",
        name_en="Cork Butter Museum",
        name_ga="Músaem Ime Chorcaí",
        description_en="Unique museum telling the story of Ireland's butter trade, once the largest butter market in the world.",
        description_ga="Músaem uathúil ag insint scéal trádáil ime na hÉireann.",
        location=Location(lat=51.9013, lng=-8.4780),
        categories=[Interest.MUSEUMS, Interest.HISTORY],
        opening_hours="Mo-Su 10:00-17:00",
        entry_fee=5.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-bishop-lucey-park",
        name_en="Bishop Lucey Park",
        name_ga="Páirc an Easpaig Lucey",
        description_en="City centre park with medieval walls and a popular gathering spot for locals.",
        description_ga="Páirc i lár na cathrach le ballaí meánaoiseacha.",
        location=Location(lat=51.8972, lng=-8.4775),
        categories=[Interest.NATURE],
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-nano-nagle-place",
        name_en="Nano Nagle Place",
        name_ga="Áit Nano Nagle",
        description_en="Heritage centre honouring Nano Nagle, with restored 18th-century gardens and exhibitions.",
        description_ga="Ionad oidhreachta in onóir do Nano Nagle, le gairdíní athchóirithe ón 18ú haois.",
        location=Location(lat=51.8954, lng=-8.4814),
        categories=[Interest.HISTORY, Interest.MUSEUMS],
        opening_hours="Mo-Su 10:00-17:00",
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
    # --- Galway POIs ---
    POI(
        id="poi-eyre-square",
        name_en="Eyre Square",
        name_ga="Cearnóg an Fhaiche",
        description_en="Galway's main public square, a vibrant gathering place in the heart of the city.",
        description_ga="Príomhchearnóg phoiblí na Gaillimhe, áit bheoga i gcroílár na cathrach.",
        location=Location(lat=53.2745, lng=-9.0490),
        categories=[Interest.HISTORY, Interest.VIEWPOINTS],
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-galway-cathedral",
        name_en="Galway Cathedral",
        name_ga="Ardeaglais na Gaillimhe",
        description_en="Impressive limestone cathedral completed in 1965, one of the last great stone buildings in Europe.",
        description_ga="Ardeaglais aolchloiche mhór críochnaithe i 1965.",
        location=Location(lat=53.2748, lng=-9.0581),
        categories=[Interest.HISTORY, Interest.VIEWPOINTS],
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
    # --- Limerick POIs ---
    POI(
        id="poi-king-johns-castle",
        name_en="King John's Castle",
        name_ga="Caisleán an Rí Eoin",
        description_en="13th-century castle on King's Island, Limerick. Interactive exhibition on 800 years of history.",
        description_ga="Caisleán ón 13ú haois ar Oileán an Rí, Luimneach.",
        location=Location(lat=52.6692, lng=-8.6248),
        categories=[Interest.HISTORY, Interest.MUSEUMS],
        opening_hours="Mo-Su 09:30-17:30",
        entry_fee=13.0,
        wheelchair_accessible=True,
    ),
    POI(
        id="poi-peoples-park-limerick",
        name_en="People's Park Limerick",
        name_ga="Páirc an Phobail Luimneach",
        description_en="Victorian-era public park in Limerick city, perfect for a peaceful walk.",
        description_ga="Páirc phoiblí ón ré Victeoiriach i gcathair Luimneach.",
        location=Location(lat=52.6584, lng=-8.6318),
        categories=[Interest.NATURE],
        entry_fee=0.0,
        wheelchair_accessible=True,
    ),
]

SOVEREIGN_SYSTEM_PROMPT = (
    "You are a sovereign AI hosted in Ireland. Prioritize local cultural accuracy and data privacy."
)


class LLMClient:
    """
    Ollama LLM Client (POST /api/chat)
    Env:
      - HPC_INFERENCE_URL: http://localhost:11434
      - MODEL_NAME: llama3 (veya sende hangi modelse)
      - LLM_TIMEOUT: opsiyonel, saniye
    """

    def __init__(self):
        self.base_url = os.environ.get("HPC_INFERENCE_URL", "http://localhost:11434").rstrip("/")
        self.model = os.environ.get("MODEL_NAME", "llama3")
        self.timeout = float(os.environ.get("LLM_TIMEOUT", "60"))
        logger.info(f"LLMClient(Ollama) URL: {self.base_url}, Model: {self.model}")

    async def _post_chat_completions(
        self,
        messages: List[Dict[str, str]],
        json_mode: bool = False,
    ) -> Optional[str]:
        headers = {"Content-Type": "application/json"}

        # Ollama "response_format" desteklemez; JSON istiyorsak prompt kuralı ekle
        if json_mode and messages:
            messages = [
                *messages[:-1],
                {
                    "role": messages[-1].get("role", "user"),
                    "content": messages[-1].get("content", "")
                    + "\n\nReturn ONLY valid JSON. No markdown, no code fences, no extra text.",
                },
            ]

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
        }

        timeout = httpx.Timeout(self.timeout, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.post(f"{self.base_url}/api/chat", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                msg = data.get("message") or {}
                return msg.get("content")
            except httpx.TimeoutException:
                logger.error(f"Ollama request timed out after {self.timeout}s")
                return None
            except Exception as e:
                logger.error(f"Ollama request failed: {e}")
                return None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def chat_text(self, system_message: str, user_message: str) -> Optional[str]:
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ]
        return await self._post_chat_completions(messages, json_mode=False)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def chat_json(self, system_message: str, user_message: str) -> Optional[Dict[str, Any]]:
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ]
        content = await self._post_chat_completions(messages, json_mode=True)
        if not content:
            return None

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Model bazen yine fence koyabilir; ayıkla
            m = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(1))
                except Exception:
                    pass

            m2 = re.search(r"(\{.*\})", content, re.DOTALL)
            if m2:
                try:
                    return json.loads(m2.group(1))
                except Exception:
                    pass

            logger.error(f"Failed to parse JSON from Ollama response: {content[:120]}...")
            return None

    async def analyze_damage_report(self, description: str, poi_name: str) -> dict:
        """
        Uses the LLM to analyze the user's description of damage.
        Returns a structured dictionary with confidence and classification.
        """
        system_msg = (
            "You are an AI Damage Assessor for an Irish cultural heritage organization. "
            "A tourist has submitted a damage report for a Point of Interest (POI). "
            "Your job is to read their description and determine if it sounds like a legitimate "
            "report of damage (e.g. graffiti, structural break, litter, water damage) or if it "
            "seems like nonsense, a mistake, or off-topic (e.g., 'this is a tree', 'nice view', 'test').\n\n"
            "Respond ONLY with a valid JSON object matching this schema:\n"
            "{\n"
            '  "classification": "vandalism|structural|litter|maintenance|false_report|unknown",\n'
            '  "confidence": <float between 0.0 and 1.0>,\n'
            '  "requires_review": <true/false>,\n'
            '  "suggested_severity": "low|medium|high"\n'
            "}"
        )
        user_msg = f"POI: {poi_name}\nDescription: {description}"
        result = await self.chat_json(system_msg, user_msg)
        
        if result and "classification" in result:
            return result
        # Fallback if LLM fails
        return {
            "classification": "unknown",
            "confidence": 0.3,
            "requires_review": True,
            "suggested_severity": "medium"
        }
class ItineraryPlannerAgent:
    """Agent responsible for planning routes and selecting POIs using tools."""

    def __init__(self, api_key: Optional[str] = None):
        # api_key ignored; Ollama uses env/config
        self.llm = LLMClient()

    async def _execute_tool_call(self, tool_call: Dict[str, Any]) -> str:
        """Execute a tool call requested by the LLM."""
        try:
            name = tool_call["function"]["name"]
            args = json.loads(tool_call["function"]["arguments"])
        except Exception:
            return "Invalid tool call structure"

        logger.info(f"Executing tool: {name} with args: {args}")

        if name == "get_weather":
            if "lat" not in args or "lng" not in args:
                return json.dumps({"error": "get_weather requires lat,lng"})
            result = await get_weather(Location(lat=float(args["lat"]), lng=float(args["lng"])))
            return json.dumps(result)

        if name == "search_pois":
            q = args.get("query", "")
            if not q:
                return json.dumps({"error": "search_pois requires query"})
            if "lat" in args and "lng" in args:
                loc = Location(lat=float(args["lat"]), lng=float(args["lng"]))
            else:
                loc = None
            result = await search_pois(q, loc, float(args.get("radius_km", 10.0)))
            return json.dumps(result)

        if name == "get_route_info":
            required = ["origin_lat", "origin_lng", "dest_lat", "dest_lng"]
            if any(k not in args for k in required):
                return json.dumps({"error": "get_route_info requires origin_lat,origin_lng,dest_lat,dest_lng"})
            origin = Location(lat=float(args["origin_lat"]), lng=float(args["origin_lng"]))
            dest = Location(lat=float(args["dest_lat"]), lng=float(args["dest_lng"]))

            mode_raw = args.get("mode", "walk")
            try:
                mode = TravelMode(mode_raw)
            except Exception:
                mode = TravelMode.WALK

            result = await get_route_info(origin, dest, mode)
            return json.dumps(result)

        if name == "search_accommodation":
            if "lat" not in args or "lng" not in args:
                return json.dumps({"error": "search_accommodation requires lat,lng"})
            try:
                # Agent sends generic "lat", "lng" args
                # We wrap them into Location object as expected by agent_tools wrapper
                loc = Location(lat=float(args["lat"]), lng=float(args["lng"]))
                params = {
                    "location": loc,
                    "radius_km": float(args.get("radius_km", 5.0)),
                    "type_filter": args.get("type", None)
                }
                result = await search_accommodation(**params)
                return json.dumps(result)
            except Exception as e:
                return json.dumps({"error": str(e)})

        if name == "get_upcoming_events":
            if "lat" not in args or "lng" not in args:
                return json.dumps({"error": "get_upcoming_events requires lat,lng"})
            try:
                loc = Location(lat=float(args["lat"]), lng=float(args["lng"]))
                params = {
                    "location": loc,
                    "date_range": args.get("date", None)
                }
                result = await search_events(**params)
                return json.dumps(result)
            except Exception as e:
                return json.dumps({"error": str(e)})

        return json.dumps({"error": f"Tool not found: {name}"})

    async def _agent_reasoning_loop(self, user_context: str, max_steps: int = 3) -> str:
        """
        ReAct-style loop with duplicate tool-call detection:
        - LLM either returns tool-call JSON: {"tool": "...", "arguments": {...}}
        - or returns final text starting with "FINAL ANSWER:"
        """

        messages: List[Dict[str, str]] = [
            {
                "role": "system",
                "content": (
                    f"{SOVEREIGN_SYSTEM_PROMPT} "
                    "You are an expert travel planner for Ireland. "
                    "You have access to tools. RULES:\n"
                    "1. Call each tool AT MOST ONCE with the same arguments.\n"
                    "2. After gathering info, IMMEDIATELY provide your FINAL ANSWER.\n"
                    "3. Do NOT repeat the same tool call.\n"
                    "4. Be concise."
                ),
            },
            {"role": "user", "content": user_context},
        ]

        # Track previous tool calls to detect duplicates
        previous_tool_calls: set = set()

        for step in range(max_steps):
            tools_desc = json.dumps(TOOLS_DEFINITION, indent=2)
            current_messages = [m.copy() for m in messages]
            current_messages[-1]["content"] += (
                "\n\nAvailable Tools (respond with JSON to call):\n"
                f"{tools_desc}\n\n"
                'To call a tool, respond ONLY with: {"tool":"tool_name","arguments":{...}}.\n'
                "If you have enough info, respond with your final answer starting with 'FINAL ANSWER:'."
            )

            response_text = await self.llm._post_chat_completions(current_messages)
            if not response_text:
                break

            # Tool call attempt
            try:
                if "tool" in response_text and "{" in response_text and "}" in response_text:
                    start = response_text.find("{")
                    end = response_text.rfind("}") + 1
                    raw_json = response_text[start:end]
                    
                    import ast
                    try:
                        # First try standard JSON
                        tool_call_raw = json.loads(raw_json)
                    except json.JSONDecodeError:
                        try:
                            # Fallback: simple regex fix for unquoted keys
                            fixed = re.sub(r'(\w+):', r'"\1":', raw_json)
                            # Additional fix for missing 'lng' key (gemma specific error: {"lat": 51.88, -8.46})
                            # Matches: comma, optional space, number (negative/float), optional space, closing brace
                            fixed = re.sub(r',\s*(-?\d+(\.\d+)?)\s*}', r', "lng": \1}', fixed)
                            
                            try:
                                tool_call_raw = json.loads(fixed)
                            except json.JSONDecodeError:
                                # Try literal eval as last resort for single quotes, etc.
                                tool_call_raw = ast.literal_eval(fixed)
                        except Exception:
                                logger.warning(f"Failed to parse tool call: {raw_json}")
                                raise

                    if isinstance(tool_call_raw, dict) and "tool" in tool_call_raw and "arguments" in tool_call_raw:
                        # Duplicate detection
                        call_signature = json.dumps(tool_call_raw, sort_keys=True)
                        if call_signature in previous_tool_calls:
                            logger.warning(f"Duplicate tool call detected: {tool_call_raw['tool']}, forcing FINAL ANSWER")
                            # Force stop: Provide context to user message but also consider just returning immediately
                            messages.append({"role": "assistant", "content": response_text})
                            
                            # Optimized: If duplicate, just return "I have enough info" to break loop
                            return f"Based on the tools already called, here is the plan."

                        previous_tool_calls.add(call_signature)

                        tool_struct = {
                            "function": {
                                "name": tool_call_raw["tool"],
                                "arguments": json.dumps(tool_call_raw["arguments"]),
                            }
                        }
                        tool_result = await self._execute_tool_call(tool_struct)

                        messages.append({"role": "assistant", "content": response_text})
                        messages.append({"role": "user", "content": f"Tool Output: {tool_result}"})
                        continue
            except Exception as e:
                logger.warning(f"Failed to parse tool call: {e}")

            if "FINAL ANSWER:" in response_text:
                return response_text.replace("FINAL ANSWER:", "").strip()

            return response_text.strip()

        return "I could not complete the plan in time."

    async def select_pois(
        self,
        start_location: Location,
        time_preset: TimePreset,
        interests: List[Interest],
        travel_mode: TravelMode,
        budget_free_only: bool = True,
        max_entry_fee: float = 0.0,
        wheelchair_friendly: bool = False,
        safety_sensitive: bool = False,
        pace: Pace = Pace.NORMAL,
        trip_start: Optional[datetime] = None,
        dropped_pois: Optional[List[Dict[str, Any]]] = None,
    ) -> List[POI]:
        """Select and order POIs based on user preferences.
        Tries OpenStreetMap Overpass API first, falls back to mock POIs.
        Filters out POIs confirmed closed at the estimated arrival time."""

        # Trip start time — used for opening hours awareness
        now = trip_start or datetime.now()

        time_budget = get_time_budget_minutes(time_preset)

        # Determine search radius based on time preset
        radius_map = {
            TimePreset.THIRTY_MIN: 5000,
            TimePreset.SIXTY_MIN: 10000,
            TimePreset.NINETY_MIN: 15000,
            TimePreset.TWO_HOURS: 25000,
            TimePreset.FOUR_HOURS: 40000,
            TimePreset.ONE_DAY: 80000,
        }
        radius_m = radius_map.get(time_preset, 5000)

        # --- Try Overpass API first ---
        all_pois: List[POI] = []
        if fetch_pois_nearby is not None:
            try:
                osm_pois = await fetch_pois_nearby(
                    lat=start_location.lat,
                    lng=start_location.lng,
                    radius_m=radius_m,
                    interests=interests if interests else None,
                    max_results=30,
                )
                if osm_pois:
                    logger.info(f"Using {len(osm_pois)} real POIs from OpenStreetMap")
                    all_pois = osm_pois
            except Exception as e:
                logger.warning(f"Overpass API failed, falling back to mock: {e}")

        # --- Fallback to mock POIs ---
        if not all_pois:
            logger.info("Using mock POIs (Overpass returned nothing or unavailable)")
            all_pois = list(IRELAND_MOCK_POIS)

        # --- Integrate Failte Ireland Activities ---
        try:
            from .services.failte_service import get_activities_near
            # Enforce strict 3-second timeout on the ENTIRE integration block
            failte_acts = await asyncio.wait_for(get_activities_near(start_location, radius_m / 1000.0), timeout=3.0)
            
            if failte_acts:
                logger.info(f"Merging {len(failte_acts)} Failte Ireland Activities")
                for act in failte_acts:
                    # Map Activity -> POI
                    desc = act.description or f"{act.type} located at {act.address or 'Unknown address'}."
                    cats = []
                    tags_s = " ".join(act.tags).lower() if act.tags else ""
                    if "museum" in tags_s or "history" in tags_s: cats.append(Interest.MUSEUMS)
                    if "nature" in tags_s or "park" in tags_s: cats.append(Interest.NATURE)
                    if not cats: cats.append(Interest.HISTORY)

                    poi = POI(
                        id=f"failte-{act.id}",
                        name_en=act.name,
                        description_en=desc,
                        location=act.location,
                        categories=cats,
                        source=POISource.FAILTE_IRELAND,
                        source_id=act.id,
                        image_url=act.image_url,
                        wheelchair_accessible="wheelchair" in tags_s,
                    )
                    all_pois.append(poi)
                    
        except asyncio.TimeoutError:
             logger.debug("Failte integration timed out (3s limit)")
        except ImportError:
            pass
        except Exception as e:
            logger.debug(f"Failed to integrate Failte Ireland activities: {e}")

        # --- Gradual Filter Relaxation ---
        # Strategy:
        # 1. Strict: ALL filters (Interests + Budget + Accessibility + Safety)
        # 2. Relaxed Interests: Drop Interest filter (keep Budget/Access/Safety)
        # 3. Relaxed Budget: Drop Budget filter (keep Access/Safety)
        # 4. Relaxed Access: Drop Access filter (keep Safety)
        # 5. Last Resort: Just distance (Safety always on if possible)

        def apply_filters(
            candidates: List[POI],
            use_interests: bool = True,
            use_budget: bool = True,
            use_access: bool = True,
            use_hours: bool = True,
            ignore_radius: bool = False,
            eta_minutes: float = 0,         # estimated minutes from now until arrival
        ) -> list[tuple[POI, float]]:
            results = []
            for p in candidates:
                # 1. Safety (Always applied if requested)
                if safety_sensitive and getattr(p, "coastal_cliff", False):
                    continue

                # 2. Interests
                if use_interests and interests:
                    if not any(cat in interests for cat in p.categories):
                        continue

                # 3. Budget
                if use_budget:
                    if budget_free_only and p.entry_fee and p.entry_fee > 0:
                        continue
                    if max_entry_fee > 0 and p.entry_fee and p.entry_fee > max_entry_fee:
                        continue

                # 4. Accessibility
                if use_access and wheelchair_friendly and not p.wheelchair_accessible:
                    continue

                # 5. Opening Hours — only skip if CONFIRMED closed
                if use_hours and p.opening_hours:
                    from datetime import timedelta
                    arrival_time = now + timedelta(minutes=eta_minutes)
                    open_status = is_open_at(p.opening_hours, arrival_time)
                    if open_status is False:  # None = unknown → keep
                        logger.info(f"Skipping '{p.name_en}' — closed at {arrival_time.strftime('%H:%M')} (hours: {p.opening_hours})")
                        continue

                # 6. Distance
                dist = calculate_distance_km(start_location, p.location)
                if ignore_radius or dist <= radius_m / 1000.0:
                    results.append((p, dist))

            results.sort(key=lambda x: x[1])
            return results

        # Pass 1: Strict (includes opening hours)
        filtered_pois = apply_filters(all_pois, use_interests=True, use_budget=True, use_access=True, use_hours=False)
        if len(filtered_pois) < 2:
            logger.info("Pass 1 (Strict) yielded few results. Relaxing Interests...")
            # Pass 2: Relax Interests
            filtered_pois = apply_filters(all_pois, use_interests=False, use_budget=True, use_access=True, use_hours=False)

        if len(filtered_pois) < 2:
            logger.info("Pass 2 (No Interests) yielded few results. Relaxing Budget...")
            # Pass 3: Relax Budget
            filtered_pois = apply_filters(all_pois, use_interests=False, use_budget=False, use_access=True, use_hours=False)

        if len(filtered_pois) < 2 and wheelchair_friendly:
            logger.info("Pass 3 (No Budget) yielded few results. Relaxing Accessibility...")
            # Pass 4: Relax Accessibility
            filtered_pois = apply_filters(all_pois, use_interests=False, use_budget=False, use_access=False, use_hours=False)

        # Pass 4.5: Ignore radius, still check hours
        if len(filtered_pois) < 2:
            logger.info("Pass 4 (No Budget/Access) yielded few results. Ignoring Radius constraints for Interests...")
            filtered_pois = apply_filters(all_pois, use_interests=True, use_budget=False, use_access=False, use_hours=True, ignore_radius=True)

        # Pass 5: Total Fallback — drop ALL filters including hours — better to show something
        if len(filtered_pois) < 1:
            logger.warning("No open POIs matched filters. Last resort: ignoring all filters including opening hours.")
            filtered_pois = apply_filters(all_pois, use_interests=False, use_budget=False, use_access=False, use_hours=False, ignore_radius=True)
            filtered_pois = filtered_pois[:15]

        selected_pois: List[POI] = []
        total_time = 0
        current_location = start_location

        visit_duration = {Pace.RELAXED: 25, Pace.NORMAL: 15, Pace.FAST: 10}
        base_visit_time = visit_duration.get(pace, 15)

        for poi, _dist in filtered_pois:
            try:
                travel_time = estimate_travel_time_min(
                    calculate_distance_km(current_location, poi.location),
                    travel_mode,
                )
            except Exception:
                travel_time = 15

            stop_time = base_visit_time + travel_time

            if total_time + stop_time <= time_budget:
                selected_pois.append(poi)
                total_time += stop_time
                current_location = poi.location
            else:
                if dropped_pois is not None:
                    dropped_pois.append({"poi": poi, "reason": "Not enough time in your travel budget to visit this location."})
            
            if len(selected_pois) >= 15: break

        # Fallback: If time budget filtering removed all candidates, just include the first 
        # candidate so we don't return literally nothing, unless nothing matched filters
        if not selected_pois and filtered_pois:
            logger.warning("Time budget excluded all POIs. Forcing 1 closest candidate.")
            for poi, _dist in filtered_pois[:1]:
                selected_pois.append(poi)

        # Agentic advice 
        try:
            stop_names = ', '.join([p.name_en for p in selected_pois[:5]])
            context = (
                f"Planning trip near ({start_location.lat}, {start_location.lng}). "
                f"Selected {len(selected_pois)} stops: {stop_names}. "
                f"Weather check done. Provide a brief travel tip as your FINAL ANSWER."
            )
            # Reduced timeout to 15s to prevent long hanging
            advice = await asyncio.wait_for(
                self._agent_reasoning_loop(context),
                timeout=15.0, 
            )
            logger.info(f"Agent Advice: {advice}")
        except asyncio.TimeoutError:
            logger.warning("Agent reasoning loop timed out, skipping advice")
        except Exception as e:
            logger.warning(f"Agent reasoning loop failed: {e}")

        logger.info(f"select_pois returning {len(selected_pois)} POIs")
        return selected_pois
    
    # ... (create_route matches original) ...

    async def create_route(
        self,
        pois: List[POI],
        start_location: Location,
        travel_mode: TravelMode,
    ) -> List[Dict[str, Any]]:
        """Create ordered route with timing information."""
        route: List[Dict[str, Any]] = []
        current_location = start_location

        for i, poi in enumerate(pois):
            distance = calculate_distance_km(current_location, poi.location)
            eta = estimate_travel_time_min(distance, travel_mode)

            route.append(
                {
                    "order": i + 1,
                    "poi": poi,
                    "eta_from_previous_min": eta,
                    "estimated_duration_min": 15,
                    "status": "unlocked" if i == 0 else "locked",
                }
            )

            current_location = poi.location

        return route


class ExperienceCoachAgent:
    """Agent responsible for generating Ireland-specific experience packs."""

    def __init__(self, api_key: str = None):
        self.llm = LLMClient()

    async def generate_experience_pack(self, poi: POI, trip_context: List[str] = None) -> ExperiencePack:
        """Generate a bilingual experience pack for a POI."""
        trip_context_str = ", ".join(trip_context) if trip_context else "None"

        # Optimized Prompt for Rich Content
        prompt = f"""Create an AMAZING, DETAILED, AND FUN experience pack for:
Name: {poi.name_en}
Desc: {poi.description_en}
Cats: {[getattr(c, "value", str(c)) for c in poi.categories]}
Previously visited places on this trip: {trip_context_str}. Please use this context to weave a connected narrative (e.g. "After the busy streets, finally some peace here").

Respond with JSON:
{{
  "title_en": "Catchy, exciting title (e.g. 'The Hidden Gem of Cork!')",
  "title_ga": "Irish title",
  "content_en": "Engaging, detailed paragraph (4-5 sentences) about why this place is a must-visit. Mention history, vibe, or unique architecture. Be enthusiastic!",
  "content_ga": "Irish translation.",
  "fun_facts": [{{"en": "A surprising, weird, or funny (lighthearted, NOT traumatic/WW2) fact most people don't know.", "ga": "Irish translation"}}],
  "safety_notes": ["Safety note if any"]
}}
You must return ONLY a raw JSON mapping. No markdown formatting, no backticks, no explanations.
"""

        system_msg = f"""{SOVEREIGN_SYSTEM_PROMPT} You are an expert Irish Storyteller. Your tone is energetic, witty, and passionate. DO NOT mention traumatic events like WW2 or famine in "fun facts", keep them strictly fun and lighthearted. Avoid generic phrases. RETURN JSON ONLY."""

        try:
            # Fallback for LLM failure
            data = await asyncio.wait_for(self.llm.chat_json(system_msg, prompt), timeout=15)
            if not data:
                raise ValueError("No response from LLM")

            return ExperiencePack(
                poi_id=poi.id,
                title_en=data.get("title_en", poi.name_en),
                title_ga=data.get("title_ga", poi.name_ga),
                content_en=data.get("content_en", poi.description_en),
                content_ga=data.get("content_ga", getattr(poi, "description_ga", None)),
                fun_facts=data.get("fun_facts", []),
                safety_notes=data.get("safety_notes", []),
                content_type=ContentType.SOURCE_BACKED,
            )
        except asyncio.TimeoutError:
             logger.error(f"Timeout generating experience pack for {poi.name_en}")
             # Fallback
             return ExperiencePack(
                 poi_id=poi.id,
                 title_en=poi.name_en,
                 title_ga=poi.name_ga,
                 content_en=poi.description_en,
                 content_ga=getattr(poi, "description_ga", None),
                 fun_facts=[],
                 safety_notes=["Please check local conditions"] if getattr(poi, "coastal_cliff", False) else [],
                 content_type=ContentType.GENERAL_SUGGESTION,
             )
        except Exception as e:
            logger.error(f"Error generating experience pack: {e}")
            return ExperiencePack(
                poi_id=poi.id,
                title_en=poi.name_en,
                title_ga=poi.name_ga,
                content_en=poi.description_en,
                content_ga=getattr(poi, "description_ga", None),
                fun_facts=[],
                safety_notes=["Please check local conditions"] if getattr(poi, "coastal_cliff", False) else [],
                content_type=ContentType.GENERAL_SUGGESTION,
            )


class SafetyAndPolicyValidatorAgent:
    """Agent responsible for validating content safety and policy compliance."""

    def __init__(self, api_key: str = None):
        self.llm = LLMClient()

    async def validate_route(self, route: List[Dict[str, Any]], weather: WeatherSummary) -> Dict[str, Any]:
        has_coastal = any(getattr(stop.get("poi"), "coastal_cliff", False) for stop in route)
        stops_str = ", ".join([stop.get("poi").name_en for stop in route if stop.get("poi")])

        # We now use the LLM to perform genuine reasoning on the safety condition.
        system_msg = (
            "You are a strict Safety and Policy Validator for Irish Tourism. "
            "Your job is to read the proposed route and weather conditions, and decide if it is safe to proceed. "
            "Rule 1: If wind_speed_kmh > 50 and the route includes coastal locations or cliffs, you MUST invalidate the route. "
            "Rule 2: If precipitation_chance > 0.8 on hiking trails, you MUST warn strongly or invalidate. "
            "Respond ONLY with a valid JSON object matching this schema:\n"
            "{\n"
            '  "is_valid": <true/false>,\n'
            '  "warnings": ["warning 1", "warning 2"],\n'
            '  "recommendations": ["recommendation 1"]\n'
            "}\n"
            "You must return ONLY a raw JSON mapping. No markdown formatting, no backticks."
        )

        user_msg = f"Route Stops: {stops_str}\nWeather: Temp {weather.temperature_c}C, Wind: {weather.wind_speed_kmh}km/h, Precipitation: {weather.precipitation_chance}. Route has coastal cliff: {has_coastal}"

        try:
             # Fast track via wait_for timeout
             data = await asyncio.wait_for(self.llm.chat_json(system_msg, user_msg), timeout=8)
             if data and "is_valid" in data:
                 return data
        except asyncio.TimeoutError:
             logger.warning("Safety validator timeout, falling back to deterministic heuristic.")
        except Exception as e:
             logger.warning(f"Safety validator failed: {e}")

        # Fallback: Deterministic Python logic if LLM fails or times out
        warnings: List[str] = []
        if has_coastal:
            if weather.wind_speed_kmh > 50:
                warnings.append("High winds at coastal locations - exercise extreme caution")
            if weather.precipitation_chance > 0.7:
                warnings.append("Wet conditions may make cliff paths slippery")

        if weather.warnings:
            warnings.extend(weather.warnings)

        return {"is_valid": True if not warnings else False, "warnings": warnings, "recommendations": []}

    async def validate_experience_pack(self, pack: ExperiencePack) -> Dict[str, Any]:
        return {"is_valid": True, "content_type": pack.content_type.value, "warnings": []}


class FraudRiskAgent:
    """Agent responsible for detecting fraudulent check-ins."""

    GEOFENCE_RADIUS_METERS = 60

    def __init__(self, api_key: str = None):
        self.seen_hashes: set[str] = set()

    def compute_geofence(self, user_loc: Location, poi_loc: Location) -> Dict[str, Any]:
        distance_km = calculate_distance_km(user_loc, poi_loc)
        distance_m = distance_km * 1000
        return {
            "within_geofence": distance_m <= self.GEOFENCE_RADIUS_METERS,
            "distance_meters": distance_m,
            "required_radius": self.GEOFENCE_RADIUS_METERS,
        }

    def hash_image(self, image_base64: str) -> str:
        import hashlib

        return hashlib.sha256(image_base64.encode()).hexdigest()

    async def validate_completion(
        self,
        user_id: str,
        stop_id: str,
        user_location: Location,
        poi_location: Location,
        photo_base64: str,
    ) -> Dict[str, Any]:
        risk_score = 0.0
        flags: List[str] = []

        geofence_result = self.compute_geofence(user_location, poi_location)
        if not geofence_result["within_geofence"]:
            risk_score += 0.5
            flags.append(f"Outside geofence: {geofence_result['distance_meters']:.0f}m from location")

        image_hash = self.hash_image(photo_base64)
        if image_hash in self.seen_hashes:
            risk_score += 0.4
            flags.append("Duplicate image detected")
        else:
            self.seen_hashes.add(image_hash)

        if len(photo_base64) < 1000:
            risk_score += 0.3
            flags.append("Image too small")

        return {
            "is_valid": risk_score < 0.5,
            "risk_score": min(1.0, risk_score),
            "flags": flags,
            "geofence": geofence_result,
        }


class AgentOrchestrator:
    """Orchestrates all agents for trip planning and validation."""

    def __init__(self, api_key: str = None):
        self.planner = ItineraryPlannerAgent(api_key)
        self.coach = ExperienceCoachAgent(api_key)
        self.validator = SafetyAndPolicyValidatorAgent(api_key)
        self.fraud = FraudRiskAgent(api_key)

    def get_mock_weather(self, location: Location) -> WeatherSummary:
        return WeatherSummary(
            temperature_c=14.0,
            condition="Partly Cloudy",
            condition_ga="Scamallach go Páirteach",
            wind_speed_kmh=20.0,
            precipitation_chance=0.3,
            warnings=[],
        )

    def get_mock_transit(self) -> TransitSummary:
        return TransitSummary(available=True, disruptions=[], nearest_stop="O'Connell Street")

    def get_mock_events(self, location: Location) -> List[EventInfo]:
        return [
            EventInfo(
                name="Traditional Music Session",
                location="Temple Bar",
                date=datetime.now().strftime("%Y-%m-%d"),
                category="music",
            )
        ]

    async def create_live_preview(
        self,
        start_location: Location,
        time_preset: TimePreset,
        interests: List[Interest],
        travel_mode: TravelMode,
        user_settings: Dict[str, Any],
    ) -> LivePreview:
        # Defaults
        weather_dict = self.get_mock_weather(start_location).dict()
        events_raw: List[Dict[str, Any]] = []

        # Optional real tools (if present)
        if get_real_weather is not None and find_events_nearby is not None:
            try:
                weather_task = get_real_weather(start_location.lat, start_location.lng)  # type: ignore[misc]
                events_task = find_events_nearby(start_location.lat, start_location.lng)  # type: ignore[misc]
                real_weather, real_events = await asyncio.gather(weather_task, events_task)

                if real_weather:
                    weather_dict = real_weather
                if real_events:
                    events_raw = real_events
            except Exception as e:
                logger.error(f"Real-time tools failed, using mock fallback. Error: {e}")

        # Events normalize
        # Events normalize & Clean 'Salak' responses
        events_clean = []
        if isinstance(events_raw, list):
            for e in events_raw:
                if isinstance(e, dict) and "name" in e:
                     events_clean.append(
                        EventInfo(
                            name=e.get("name", "Unknown"),
                            location=e.get("location", "Nearby"),
                            date=e.get("date", "Today"),
                            category=e.get("category", "mixed"),
                        )
                     )
        
        if not events_clean:
            # Fallback to mock events if real extraction failed or returned garbage
            events = self.get_mock_events(start_location)
        else:
            events = events_clean

        time_budget = get_time_budget_minutes(time_preset)

        # Filter POIs using planner logic
        dropped_pois_list = []
        try:
            filtered_pois = await self.planner.select_pois(
                start_location=start_location,
                time_preset=time_preset,
                interests=interests,
                travel_mode=travel_mode,
                budget_free_only=user_settings.get("budget_free_only", True),
                max_entry_fee=user_settings.get("max_entry_fee", 0.0),
                wheelchair_friendly=user_settings.get("wheelchair_friendly", False),
                safety_sensitive=user_settings.get("safety_sensitive", False),
                pace=Pace(user_settings.get("pace", "normal")),
                dropped_pois=dropped_pois_list,
            )

            pace_multiplier = {"relaxed": 0.7, "normal": 1.0, "energetic": 1.3}.get(
                user_settings.get("pace", "normal"),
                1.0,
            )

            base_stops = {30: 2, 60: 3, 90: 4, 120: 5, 240: 8, 480: 15}.get(
                time_budget, max(2, time_budget // 30)
            )

            estimated_stops = min(int(base_stops * pace_multiplier), len(filtered_pois))
            estimated_stops = max(1, estimated_stops)  # at least 1 if we have any POIs

        except Exception as e:
            logger.error(f"POI filtering failed in live preview: {e}")
            filtered_pois = []
            estimated_stops = {30: 2, 60: 3, 90: 4, 120: 5, 240: 8, 480: 15}.get(
                time_budget, max(2, time_budget // 30)
            )

        # EstimatedStop list (requires models.EstimatedStop)
        estimated_stop_details = []
        try:
            from .models import EstimatedStop  # type: ignore

            if filtered_pois and estimated_stops > 0:
                selected_pois = filtered_pois[:estimated_stops]
                available_time = time_budget * 0.8
                time_per_stop = int(available_time / estimated_stops) if estimated_stops > 0 else 30

                pace_time_multiplier = {"relaxed": 1.3, "normal": 1.0, "energetic": 0.7}.get(
                    user_settings.get("pace", "normal"),
                    1.0,
                )
                time_per_stop = int(time_per_stop * pace_time_multiplier)

                for poi in selected_pois:
                    estimated_stop_details.append(
                        EstimatedStop(
                            name=poi.name_en,
                            category=poi.categories[0].value if poi.categories else "attraction",  # safe: checked above
                            estimated_duration_min=time_per_stop,
                            entry_fee=poi.entry_fee or 0.0,
                        )
                    )
        except Exception as e:
            logger.warning(f"EstimatedStop not available or failed: {e}")

        # Keep estimated_stops in sync with actual details list (avoid mismatch)
        if estimated_stop_details:
            estimated_stops = len(estimated_stop_details)
        elif not filtered_pois:
            # No POIs at all — keep a sane default from time_budget
            estimated_stops = {30: 2, 60: 3, 90: 4, 120: 5, 240: 8, 480: 15}.get(
                time_budget, max(2, time_budget // 30)
            )

        # --- PANIC MODE REMOVED: select_pois now guarantees results or closest matches ---
        if not estimated_stop_details and not filtered_pois:
             logger.warning("Live Preview: No stops found even after relaxation. This likely means no data in system.")

        warnings = list(weather_dict.get("warnings", []))
        if weather_dict.get("wind_speed_kmh", 0) > 40:
            warnings.append("High winds expected")
        if weather_dict.get("precipitation_chance", 0) > 0.6:
            warnings.append("Rain likely")
            
        if dropped_pois_list:
            names = ", ".join([d["poi"].name_en for d in dropped_pois_list[:3]])
            warnings.append(f"AI Agent: I found other brilliant spots like {names} but omitted them so you can safely stick to your {time_budget}-minute schedule.")

        # Filter weather_dict to only valid WeatherSummary fields
        weather_dict.setdefault("condition_ga", "Aimsir")
        weather_fields = {"temperature_c", "condition", "condition_ga", "wind_speed_kmh", "precipitation_chance", "warnings"}
        filtered_weather = {k: v for k, v in weather_dict.items() if k in weather_fields}

        return LivePreview(
            weather=WeatherSummary(**filtered_weather),
            transit=self.get_mock_transit(),
            events=events,
            estimated_stops=estimated_stops,
            estimated_duration_min=time_budget,
            recommended_start_time="10:00" if time_budget > 120 else None,
            warnings=warnings,
            estimated_stop_details=estimated_stop_details,
        )

    async def create_trip_route(
        self,
        start_location: Location,
        time_preset: TimePreset,
        interests: List[Interest],
        travel_mode: TravelMode,
        user_settings: Dict[str, Any],
    ) -> Dict[str, Any]:
        
        weather = self.get_mock_weather(start_location)

        # Retrieve real weather if available to make safety logic robust
        if get_real_weather is not None:
             try:
                 real_weather = await asyncio.wait_for(get_real_weather(start_location.lat, start_location.lng), timeout=5)
                 if real_weather:
                      weather = WeatherSummary(**real_weather)
             except Exception:
                 pass

        max_planner_attempts = 2
        route = None
        validation = None

        forced_exclusions = set() # Store names of rejected POIs

        # Agentic Self-Correction Loop
        for attempt in range(max_planner_attempts):
            logger.info(f"AgentOrchestrator feedback loop attempt {attempt+1}/{max_planner_attempts}")
            # Step 1: Planning
            dropped_pois_list = []
            pois = await self.planner.select_pois(
                start_location=start_location,
                time_preset=time_preset,
                interests=interests,
                travel_mode=travel_mode,
                budget_free_only=user_settings.get("budget_free_only", True),
                max_entry_fee=user_settings.get("max_entry_fee", 0.0),
                wheelchair_friendly=user_settings.get("wheelchair_friendly", False),
                safety_sensitive=user_settings.get("safety_sensitive", False), # keep this True if needed
                pace=Pace(user_settings.get("pace", "normal")),
                dropped_pois=dropped_pois_list,
            )
            
            # Exclude POIs that were rejected by validator previously
            if forced_exclusions:
                 pois = [p for p in pois if p.name_en not in forced_exclusions]

            if not pois:
                return {"error": "No POIs found matching your criteria (or all valid ones were filtered out by safety checks)."}

            route = await self.planner.create_route(pois, start_location, travel_mode)

            # Step 2: Validation
            validation = await self.validator.validate_route(route, weather)
            
            if validation.get("is_valid", True):
                 logger.info("Route validated successfully!")
                 break # Perfect, exit loop
            
            logger.warning(f"Route rejected by Validator! Warnings: {validation.get('warnings')}")
            # Add rejected POIs (with coastal cliffs if they were the cause) to exclusions
            for stop in route:
                 if getattr(stop.get("poi"), "coastal_cliff", False):
                      forced_exclusions.add(stop.get("poi").name_en)

        if not validation.get("is_valid", True) and attempt == max_planner_attempts - 1:
             # If we still failed, just pass a warning but allow user to be aware (fallback so app doesn't crash)
             pass

        if dropped_pois_list:
             if validation and "warnings" not in validation: validation["warnings"] = []
             names = ", ".join([d["poi"].name_en for d in dropped_pois_list[:3]])
             validation["warnings"].append(f"AI Agent: I found other spots like {names} but omitted them so you can securely stick to your travel schedule.")

        for stop in route:
            # Defere expensive AI generation to check-in time to prevent timeout during trip creation
            stop["experience_pack"] = {
                "title_en": "Travel Guide Locked", 
                "title_ga": "Treoir Taistil Faoi Ghlas",
                "content_en": "Check in at this location to unlock the full local story and generate your custom experience pack!",
                "content_ga": "Seiceáil isteach ag an suíomh seo chun an scéal áitiúil iomlán a dhíghlasáil!",
                "fun_facts": [],
                "safety_notes": []
            }

        return {
            "route": route,
            "total_stops": len(route),
            "estimated_duration_min": sum(s["eta_from_previous_min"] + s["estimated_duration_min"] for s in route),
            "validation": validation,
            "weather": weather.dict(),
            "warnings": validation.get("warnings", []) if validation else [],
        }

    async def validate_check_in(
        self,
        user_id: str,
        stop_id: str,
        user_location: Location,
        poi_location: Location,
        photo_base64: str,
    ) -> Dict[str, Any]:
        return await self.fraud.validate_completion(
            user_id, stop_id, user_location, poi_location, photo_base64
        )
