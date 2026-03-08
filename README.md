# 🌍 Project Overview

## 1. Project Title
**Ireland Explorer: Intelligent Itinerary & Heritage Management System**

## 2. Project Description
Imagine a tourist arriving in Ireland, eager to explore its rich history and breathtaking landscapes, only to be met with unpredictable weather, overcrowded hotspots, and static, uninspiring guidebooks. On the flip side, local authorities struggle to manage the sheer volume of visitors while simultaneously protecting centuries-old heritage sites from unnoticed wear-and-tear or damage.

**Ireland Explorer** bridges this gap. It is a comprehensive, AI-driven travel management platform powered by a highly resilient **Hybrid Multi-Agent Architecture**. Rather than acting as a simple chatbot, mysystem deploys a team of specialized, autonomous AI agents—a *Planner*, a *Safety Validator*, an *Experience Coach*, and a *Fraud/Damage Detector*. Together, they craft dynamic, hyper-personalized travel itineraries, generate rich bilingual (Gaeilge/English) narratives that react to the user's ongoing journey, and provide a verified, crowdsourced mechanism for citizens and tourists to report infrastructure damage directly to authorities.

## 3. How Can This Project Help Ireland
**The Irish Challenge:** Ireland faces a unique trilemma: sustainably managing the booming tourism sector, preserving its ancient and fragile cultural heritage, and keeping the Irish language (Gaeilge) alive and relevant in the digital age—all while navigating famously unpredictable weather.

**My Solution:**
*   🧭 **Smarter Footfall Distribution:** Real-time, AI-driven routing redirects tourists away from overwhelmed hotspots (like the Cliffs of Moher at peak hours) towards hidden local gems, distributing economic benefits across wider regions.
*   🗣️ **Digital Cultural Preservation:** my*ExperienceCoachAgent* actively weaves the Irish language and authentic local lore into every step of the journey, ensuring the cultural depth of Ireland is the centerpiece of the tourist experience, not an afterthought.
*   🛡️ **Proactive Heritage Maintenance:** Through AI-validated citizen reporting, local councils can instantly detect, classify, and respond to vandalism or weather damage at heritage sites, drastically reducing inspection costs and response times.
*   ⛈️ **Dynamic Weather Safety:** The *SafetyValidatorAgent* actively monitors conditions, automatically rerouting tourists away from dangerous coastal cliffs during high winds—preventing accidents before they happen.

## 4. Project Innovation
mycore AI innovation is **Guarded Autonomy via Native Agentic Orchestration**. 

Instead of relying on fragile, "black-box" frameworks that often hallucinate or crash during complex tasks, Iengineered a native, self-correcting Orchestrator built purely on Core Python. myagents utilize dynamic **Feedback Loops**. For example, if the *Planner Agent* suggests a coastal route during a storm, the *Safety Validator Agent* physically intercepts the output, rejects it, and forces the Planner to generate a safe, indoor alternative. This ensures 100% policy compliance without taking the human user out of the loop.

## 5. Expected Impacts
*   **Economic:** Fairer distribution of tourism-generated revenue to rural and off-the-beaten-path businesses.
*   **Societal:** A safer environment for tourists and an innovative platform to normalize and promote the Irish language (Gaeilge) globally.
*   **Technical:** Proving that AI applications can achieve zero-crash reliability in real-world geospatial scenarios by combining deterministic fail-safes with probabilistic AI reasoning.

---

# 🛠️ Implementation Plan

## 1. Data Specification
*   **Data Sources:** OpenStreetMap (via Nominatim/Overpass APIs) for precise geospatial routing; Fáilte Ireland Open Data for authentic national POIs; live environmental data mockups (Met Éireann styling).
*   **Data Types:** Complex JSON structures for inter-agent communication, GeoJSON for map rendering, and Base64/JPEG for visual damage reports.
*   **Collection Methods:** Asynchronous REST APIs for user telemetry; secure, hash-verified uploads for location-based check-ins and photo submissions.
*   **Storage & Security:** MinIO (S3-compatible) for encrypted object storage of user photos, and relational structuring for tracking verified damage reports. 

## 2. AI System Framework Specification
**A Deliberate Departure from the Mainstream:** Iexpressly **chose not to use** generic frameworks like LangChain, AutoGen, or CrewAI. In a production-ready, safety-critical tourism app, those frameworks introduce 'Spaghetti Code', excessive token bloat, and uncontrolled hallucination risks.

Instead, myframework consists of:
*   **Core Python Asyncio & Pydantic:** For strict, type-safe schema validation between agents.
*   **Tenacity (Resilience Network):** To handle LLM timeouts. If the AI provider fails, mynetwork uses exponential backoffs to retry, or seamlessly falls back to a deterministic algorithm to ensure the app *never* crashes.
*   **Specialized Native Agents:**
    *   `ItineraryPlannerAgent`: Orchestrates Tool-Use (Weather APIs, OSM Data).
    *   `ExperienceCoachAgent`: Maintains "Stateful Memory" of the user's trip to generate context-aware Gaeilge/English stories.
    *   `SafetyAndPolicyValidatorAgent`: Evaluates routes via strict LLM reasoning.
    *   `FraudRiskAgent`: Uses deterministic geofencing and image hashing (SHA-256) to validate physical check-ins.

## 3. Project Roadmap and Timeline
*   **Phase 1: Foundation (Weeks 1-2):** Map architecture, establish FastAPI backend, React Native mobile frontend, and MinIO storage containers.
*   **Phase 2: Agent Development (Weeks 3-4):** Build the native LLM client, implement Pydantic schemas, and create the *Planner* and *Coach* agents.
*   **Phase 3: Feedback Loops & Safety (Weeks 5-6):** Introduce the *Safety Validator* and construct the self-correcting orchestration loops. Implement the `tenacity` fallback mechanisms.
*   **Phase 4: Polish & Deployment (Weeks 7-8):** Integrate Fáilte Ireland real-world data, finalize the mobile UX/UI with animations, and package the solution via Docker Compose for seamless demonstration.

---

# 💡 Technical Novelty and Innovation

## 1. Novelty
The true technical novelty of *Ireland Explorer* is its **Zero-Crash, Self-Correcting Architecture**.

1.  **Dynamic Self-Correction:** Most LLM apps accept the first generated response. myOrchestrator reviews the AI's work using a separate AI. If a safety threshold is breached, the Orchestrator initiates an internal ReAct loop to fix the issue before the user ever sees it.
2.  **Stateful Agent Memory:** The *Experience Coach* knows where the user has been. If a user visits Dublin Castle and then goes to a park, the AI will contextually say, *"After the thick stone walls of the castle, the open green of this park will feel incredibly refreshing."*
3.  **Deterministic AI Guardrails:** Iblend probabilistic LLM reasoning with hard math. Iuse Dijkstra-style distance calculations to narrow down hundreds of locations to the top 10, and *only then* engage the LLM to pick the top 3 based on 'vibe' and user pace. This saves massive token costs and eliminates geographic hallucinations.

### 🏗️ Agentic System Architecture
```text
                                  +-------------------+
                                  |    User Request   |
                                  |  (Mobile / Web)   |
                                  +---------+---------+
                                            |
                                  +---------v---------+
                                  | AgentOrchestrator | (Manages State & Feedback Loops)
                                  +---------+---------+
                                            |
      +-------------------------------------+-------------------------------------+
      |                                     |                                     |
+-----v-------------+             +---------v---------+               +-----------v---------+
| Planner Agent     | <--Loop---> | Safety Validator  |               |  Coach Agent        |
| (Uses: Weather,   |  (Rejects   | (LLM Reasoning on |               | (Bilingual Context, |
| OSM API, Routing) |  Unsafe)    |  Storm Risks)     |               |  Stateful Memory)   |
+-------------------+             +-------------------+               +---------------------+
                                            |                                     |
                                   +--------v--------+                            |
                                   | Fallback Logic  |  <=========================+ 
                                   | (determinstic)  |   If API Fails / Timeouts
                                   +-----------------+
```

## 2. Demonstration and Description
All necessary files to build, run, and review the project are included in the repository.

*   **GitHub Repository Structure:**
    *   📁 `backend/` - Contains the Python FastApi server, the `agents.py` (which houses the native Agent Orchestrator), and the core business logic.
    *   📱 `frontend/` - The React Native mobile application for the tourist interface.
    *   🐳 `docker-compose.yml` - One-click infrastructure deployment (Backend, MinIO Storage, MailHog).
*   **How to Run:**
    Simply run `docker-compose up -d` to launch the backend, storage, and email services, followed by `npm run start` in ymyfrontend directory to launch the mobile companion. 
*   **Live Demo / Video:** *(Insert Link to Demo Video Here)*

---

# ✨ Core Application Features 

### 1. 📍 Background Geofencing Notifications
Proactively notifies tourists about nearby Points of Interest (POIs) to encourage serendipitous exploration.
*   **Enable/Disable:** Toggle in the "Trip Settings" screen.
*   **Mechanism:** Uses `expo-background-fetch` and `expo-location` to continuously poll the backend for nearby cultural hotspots without draining the battery.

### 2. 📴 Offline Itinerary Support
Touring rural Ireland often means spotty cellular coverage. The app persists critical trip data locally.
*   **Storage:** Uses React Native's `AsyncStorage` to securely cache the active trip.
*   **Behavior:** If network requests fail, the app automatically loads the last saved trip, ensuring the tourist is never left stranded without a map.

### 3. 🎙️ Voice-Enabled Place Chat (Accessibility)
Hands-free, interactive exploration of historical locations.
*   **Usage:** Hold the microphone button in the Chat screen to record questions. The AI assistant's personalized response is read aloud via local Text-to-Speech (TTS) engines.
*   **Impact:** Massive accessibility upgrade for visually impaired tourists or those walking/driving.

## 💬 Contextual Place Chatbot
Beyond the pre-generated "Experience Packs," the system includes a reactive conversational agent for specific places.
*   **Endpoint:** `POST /api/chat/place`
*   **Usage:** From the Place Detail screen, visitors can tap the chat icon to ask specific, unscripted questions (e.g., *"When was this tower rebuilt?"*) and the Chatbot responds using validated local lore.

---

# 🚀 Execution Workflow (How to Test)

1.  ▶️ **Initialization:** Run `docker-compose up` to start the backend, MinIO (S3-storage), and MailHog services simultaneously.
2.  🗺️ **Planning:** A user requests a trip via the Mobile UI. The `AgentOrchestrator` invokes the `PlannerAgent`, refining POIs via Safety Agent Validation.
3.  🗣️ **Enrichment:** The `CoachAgent` populates the route with context-aware, bilingual content leveraging the local or cloud LLM provider.
4.  📍 **Physical Action:** The user physically visits the site and "Checks In".
5.  🔍 **Verification:** The `FraudRiskAgent` validates the user's GPS ping and performs a photo hash check against the target POI to prevent spoofing.
6.  ⚠️ **Reporting:** If the tourist observes damage (e.g. graffiti on a monument), they submit a photo report. The `StubDamageClassifier` categorizes the severity and an alert email is instantly dispatched via MailHog to local mock authorities.
