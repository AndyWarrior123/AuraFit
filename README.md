# AuraFit ⚔️

A modern, gamified RPG Daily Activity Tracker that converts your real-world health biometrics, physical movement, and dietary logs into a classic RPG character sheet. 

Featuring a seamless **Gemini AI voice intent parser**, AuraFit allows you to talk to your fitness application naturally, interpreting your spoken entries into structured physical data in real time.

[Pixel/Wear OS Smartwatch]
│
▼ (Auto-Syncs)
[Google Health Cloud] ◄─── (OAuth 2.0) ───┐
▼
[Web Client (React)] ◄─── (JSON API) ───► [FastAPI Backend] ───► [PostgreSQL DB]
▲
[Future Android Client] ◄─ (Same API) ────┘

---

## 🚀 Key Architectural Pillars

* **Backend-Driven Gamification Core:** All biological metrics (Mifflin-St Jeor BMR, MET physical calculations) and RPG level-up curves reside entirely in a decoupled backend engine. The web client and future Android client behave identically: as lean presentation shells consuming shared REST endpoints.
* **Gemini Flash Intent Pipeline:** Built using the modern Google GenAI SDK. It processes raw spoken voice text payloads and uses **Structured Outputs** (JSON Schema enforcement) to reliably map arbitrary statements into typed database transactions.
* **Android-First Preparation:** The relational database layer is pre-engineered with unique integration hooks (such as `hc_record_id` strings) to handle native **Android Health Connect** background syncing in Phase 2 without requiring backend database adaptations or risking duplicate XP records.

---

## 🛠️ The Tech Stack

### Backend (`/aurafit-api`)
* **Framework:** FastAPI (Python 3.11+) utilizing fully asynchronous execution (`asyncio` + `uvicorn`).
* **Database ORM:** SQLAlchemy 2.0 connected via `asyncpg` to a **PostgreSQL** instance.
* **Migrations:** Alembic for automatic, incremental database tracking.
* **AI Engine:** Google GenAI SDK (`gemini-2.0-flash`) utilizing JSON schema constraints.
* **Data Validation:** Pydantic v2 for precise, safe request/response validation.

### Web Frontend (`/aurafit-web`)
* **Core Build Setup:** React 18+ powered by Vite and fully strict TypeScript.
* **State Management:** Zustand for lightweight, decoupled application state slices.
* **Data Fetching:** React Query (TanStack) for caching, optimistic UI rendering, and server-state polling sync loops.
* **Styling:** TailwindCSS paired with modern custom RPG SVG visualization components.

---

## 📂 System Directory Structure

```text
aurafit/
├── aurafit-api/                  # Backend Single Source of Truth
│   ├── app/
│   │   ├── api/v1/               # Router endpoints (auth, activities, character, voice)
│   │   ├── core/                 # Config handling, JWT security, DI wrappers
│   │   ├── db/                   # Async session lifecycle factories
│   │   ├── models/               # SQLAlchemy transactional ORM mappings
│   │   ├── schemas/              # Pydantic serialization data contracts
│   │   ├── services/             # Pure domain logic (biometrics, MET engines, Gemini)
│   │   └── utils/                # MET lookup tables, logging configurations
│   ├── tests/                    # Core mathematical unit & integration tests
│   ├── Dockerfile
│   └── docker-compose.yml        # Orchestrates Local PostgreSQL + API
│
└── aurafit-web/                  # React Browser Interface Client
    ├── src/
    │   ├── api/                  # Direct server communication API clients
    │   ├── auth/                 # Google OAuth 2.0 workflows & route locks
    │   ├── components/
    │   │   ├── activity/         # Input dialogs and voice recording widgets
    │   │   └── rpg/              # Dynamic SVGs (Hex graphs, level progress bars)
    │   ├── store/                # Zustand client cache layers
    │   └── pages/                # Complete feature-view route structures
    └── vite.config.ts