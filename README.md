# 🌍 Ireland Explorer AI: Intelligent Itinerary & Heritage Management System

![Project Status](https://img.shields.io/badge/Status-Active_Development-success)
![Framework](https://img.shields.io/badge/Architecture-Hybrid_Multi--Agent-orange)
![Frontend](https://img.shields.io/badge/Frontend-React_Native-blue)
![Backend](https://img.shields.io/badge/Backend-Python_%7C_FastAPI_%7C_MinIO-blueviolet)

> **Sustainably managing Irish tourism with Zero-Crash, Autonomous AI Orchestration.**

## 📖 Project Overview

Imagine a tourist arriving in Ireland, eager to explore its rich history and breathtaking landscapes, only to be met with unpredictable weather, overcrowded hotspots, and static, uninspiring guidebooks. On the flip side, local authorities struggle to manage the sheer volume of visitors while simultaneously protecting centuries-old heritage sites from unnoticed wear-and-tear or damage.

**Ireland Explorer** bridges this gap. It is a comprehensive, AI-driven travel management platform powered by a highly resilient **Hybrid Multi-Agent Architecture**. Rather than acting as a simple chatbot, the system deploys a team of specialized, autonomous AI agents—a *Planner*, a *Safety Validator*, an *Experience Coach*, and a *Fraud/Damage Detector*. Together, they craft dynamic, hyper-personalized travel itineraries, generate rich bilingual (Gaeilge/English) narratives that react to the user's ongoing journey, and provide a verified, crowdsourced mechanism for citizens and tourists to report infrastructure damage directly to authorities.

### 🏆 Key Innovation

The core AI innovation is **Guarded Autonomy via Native Agentic Orchestration**. 

Instead of relying on fragile, "black-box" frameworks that often hallucinate or crash during complex tasks, we engineered a native, self-correcting Orchestrator built purely on Core Python. The agents utilize dynamic **Feedback Loops**. For example, if the *Planner Agent* suggests a coastal route during a storm, the *Safety Validator Agent* physically intercepts the output, rejects it, and forces the Planner to generate a safe, indoor alternative. This ensures 100% policy compliance without taking the human user out of the loop.

---

## 🎯 How Can This Project Help Ireland

Ireland faces a unique trilemma: sustainably managing the booming tourism sector, preserving its ancient and fragile cultural heritage, and keeping the Irish language (Gaeilge) alive and relevant in the digital age—all while navigating famously unpredictable weather.

| Feature | Description |
| :--- | :--- |
| 🧭 **Smarter Footfall** | Real-time, AI-driven routing redirects tourists away from overwhelmed hotspots (like the Cliffs of Moher) towards hidden local gems. |
| 🗣️ **Digital Preservation** | The *ExperienceCoachAgent* actively weaves the Irish language and authentic local lore into every step of the journey. |
| 🛡️ **Proactive Maintenance** | AI-validated citizen reporting allows local councils to instantly detect and classify vandalism or weather damage at heritage sites. |
| ⛈️ **Dynamic Weather Safety** | The *SafetyValidatorAgent* actively monitors conditions, automatically rerouting tourists away from dangerous areas during high winds. |

---

## 💡 Technical Novelty and Innovation

The true technical novelty of *Ireland Explorer* is its **Zero-Crash, Self-Correcting Architecture**.

1. **Dynamic Self-Correction:** Most LLM apps accept the first generated response. Our Orchestrator reviews the AI's work using a separate AI. If a safety threshold is breached, the Orchestrator initiates an internal ReAct loop to fix the issue before the user ever sees it.
2. **Stateful Agent Memory:** The *Experience Coach* knows where the user has been. If a user visits Dublin Castle and then goes to a park, the AI will contextually say, *"After the thick stone walls of the castle, the open green of this park will feel incredibly refreshing."*
3. **Deterministic AI Guardrails:** We blend probabilistic LLM reasoning with hard math. We use Dijkstra-style distance calculations to narrow down hundreds of locations to the top 10, and *only then* engage the LLM to pick the top 3 based on 'vibe' and user pace. This saves massive token costs and eliminates geographic hallucinations.

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

---

## 🛠️ Implementation & System Framework

### 1. AI System Framework Specification
**A Deliberate Departure from the Mainstream:** We expressly **chose not to use** generic frameworks like LangChain, AutoGen, or CrewAI. In a production-ready, safety-critical tourism app, those frameworks introduce 'Spaghetti Code', excessive token bloat, and uncontrolled hallucination risks.

Instead, our framework consists of:
* **Core Python Asyncio & Pydantic:** For strict, type-safe schema validation between agents.
* **Tenacity (Resilience Network):** To handle LLM timeouts. If the AI provider fails, our network uses exponential backoffs to retry, or seamlessly falls back to a deterministic algorithm to ensure the app *never* crashes.
* **Specialized Native Agents:**
    * `ItineraryPlannerAgent`: Orchestrates Tool-Use (Weather APIs, OSM Data).
    * `ExperienceCoachAgent`: Maintains "Stateful Memory" of the user's trip.
    * `SafetyAndPolicyValidatorAgent`: Evaluates routes via strict LLM reasoning.
    * `FraudRiskAgent`: Uses deterministic geofencing and image hashing (SHA-256) to validate physical check-ins.

### 2. Data Specification
* **Data Sources:** OpenStreetMap (via Nominatim/Overpass APIs); Fáilte Ireland Open Data; live environmental data mockups (Met Éireann styling).
* **Data Types:** Complex JSON structures, GeoJSON for map rendering, and Base64/JPEG for visual damage reports.
* **Storage & Security:** MinIO (S3-compatible) for encrypted object storage of user photos, and relational structuring for tracking verified damage reports. Secure, hash-verified uploads for location-based check-ins.

---

## ✨ Core Application Features 

* 📍 **Background Geofencing Notifications:** Proactively notifies tourists about nearby POIs using `expo-background-fetch` and `expo-location` without draining the battery.
* 📴 **Offline Itinerary Support:** Uses React Native's `AsyncStorage` to securely cache the active trip. If network requests fail in rural areas, the app automatically loads the last saved trip.
* 🎙️ **Voice-Enabled Place Chat (Accessibility):** Hands-free, interactive exploration. The AI assistant's personalized response is read aloud via local Text-to-Speech (TTS) engines.
* 💬 **Contextual Place Chatbot:** A reactive conversational agent (`POST /api/chat/place`). Visitors can ask specific, unscripted questions and get responses using validated local lore.

---

## 💻 Installation & Usage (Execution Workflow)

### 1. Project Structure
```text
Ireland-Explorer-AI/
├── backend/                 # Python FastApi server, native Agent Orchestrator (agents.py)
├── frontend/                # React Native mobile application for the tourist interface
├── docker-compose.yml       # One-click infrastructure deployment (Backend, MinIO, MailHog)
└── README.md                # Project Documentation
```

### 2. How to Run & Test
1.  ▶️ **Initialization:** Run `docker-compose up -d` to start the backend, MinIO (S3-storage), and MailHog services simultaneously. Run `npm run start` in your frontend directory to launch the mobile companion.
2.  🗺️ **Planning:** A user requests a trip via the Mobile UI. The `AgentOrchestrator` invokes the `PlannerAgent`, refining POIs via Safety Agent Validation.
3.  🗣️ **Enrichment:** The `CoachAgent` populates the route with context-aware, bilingual content.
4.  📍 **Physical Action:** The user physically visits the site and "Checks In".
5.  🔍 **Verification:** The `FraudRiskAgent` validates the user's GPS ping and performs a photo hash check against the target POI to prevent spoofing.
6.  ⚠️ **Reporting:** If the tourist observes damage, they submit a photo report. The `StubDamageClassifier` categorizes the severity and an alert email is instantly dispatched via MailHog to local mock authorities.

*Live Demo / Video: (Insert Link to Demo Video Here)*

---

## 📈 Project Roadmap

* **Phase 1 (Weeks 1-2):** Map architecture, establish FastAPI backend, React Native frontend, and MinIO storage.
* **Phase 2 (Weeks 3-4):** Build native LLM client, implement Pydantic schemas, create *Planner* and *Coach* agents.
* **Phase 3 (Weeks 5-6):** Introduce *Safety Validator*, construct self-correcting loops, implement `tenacity` fallback.
* **Phase 4 (Weeks 7-8):** Integrate Fáilte Ireland data, finalize mobile UX/UI, package via Docker Compose.

---

## 🌍 Expected Impacts

* **Economic:** Fairer distribution of tourism-generated revenue to rural and off-the-beaten-path businesses.
* **Societal:** A safer environment for tourists and an innovative platform to normalize and promote the Irish language (Gaeilge) globally.
* **Technical:** Proving that AI applications can achieve zero-crash reliability in real-world geospatial scenarios.

---

## 💻 Built With (Tech Stack)

<p align="left">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native"/>
  <img src="https://img.shields.io/badge/Ollama-FFFFFF?style=for-the-badge&logo=ollama&logoColor=black" alt="Ollama"/>
  <img src="https://img.shields.io/badge/MinIO-C7202C?style=for-the-badge&logo=minio&logoColor=white" alt="MinIO"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
</p>

---

## 👤 Author & Producer

**Elif Gul Abdul Halim**
* *AI Engineer & Project Lead*

---

> *"Navigating the future of Irish heritage with safety, language, and zero-crash autonomy."* — **Ireland Explorer**
