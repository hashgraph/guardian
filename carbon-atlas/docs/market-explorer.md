# Market Explorer — Architecture & Deployment Guide

The Market Explorer extends Carbon Atlas with a comprehensive carbon market data service covering **Verra VCS**, **Gold Standard**, **ACR**, **CAR**, and **ART TREES** registries. It provides a searchable, filterable dashboard of projects and credit transactions across all major voluntary carbon registries.

## Screenshots

### Market Dashboard
![Market Dashboard](screenshots/market-dashboard.png)

### Projects List
![Projects List](screenshots/market-projects.png)

### Project Detail
![Project Detail](screenshots/market-project-detail.png)

### MECD Dashboard (existing Carbon Atlas)
![MECD Dashboard](screenshots/mecd-dashboard.png)

## Architecture

```mermaid
graph TB
    subgraph "Data Sources"
        VERRA[("Verra Registry<br/>projects.csv + vcus.csv")]
        GS[("Gold Standard<br/>projects.csv + credits CSVs")]
    end

    subgraph "ETL Pipeline (Python)"
        HARMONIZE["offsets-db-data<br/>Harmonize + validate"]
        EXTENDED["Extended Schema<br/>SDGs, certs, crediting periods"]
        STATUS["Status Mapping<br/>8 statuses vs base 3"]
        CHANGE["Change Detection<br/>Hash-based event generation"]
    end

    subgraph "Database"
        PG[("PostgreSQL 16<br/>5 tables, ~490K rows")]
    end

    subgraph "API (FastAPI)"
        API["FastAPI + asyncpg<br/>14 endpoints"]
    end

    subgraph "Frontend (Next.js)"
        FE["Next.js 16 + React 19<br/>TanStack Query + shadcn/ui"]
    end

    VERRA --> HARMONIZE
    GS --> HARMONIZE
    HARMONIZE --> EXTENDED
    EXTENDED --> STATUS
    STATUS --> CHANGE
    CHANGE --> PG
    PG --> API
    API --> FE
```

## Data Flow

```mermaid
sequenceDiagram
    participant CSV as Raw CSVs
    participant HP as Harmonization Processors
    participant EXT as Extended Schema
    participant SM as Status Mapping
    participant CD as Change Detection
    participant DB as PostgreSQL
    participant API as FastAPI
    participant FE as Next.js

    CSV->>HP: Read raw registry exports
    HP->>HP: Harmonize countries, protocols, categories
    HP->>EXT: Harmonized DataFrame
    EXT->>EXT: Merge SDGs, certs, crediting periods
    EXT->>SM: Extended DataFrame
    SM->>SM: Map 8 statuses from raw registry status
    SM->>CD: Final DataFrame
    CD->>CD: Hash rows, detect changes
    CD->>DB: Upsert projects, credits, developers, events
    FE->>API: GET /api/v1/projects?status=crediting
    API->>DB: SELECT with filters
    DB->>API: Results
    API->>FE: PaginatedResponse JSON
```

## Data Model

```mermaid
erDiagram
    projects ||--o{ credits : "has"
    projects ||--o{ project_developer_links : "linked via"
    project_developers ||--o{ project_developer_links : "linked via"
    projects ||--o{ events : "tracks"

    projects {
        string project_id PK
        string name
        string registry
        string proponent
        jsonb protocol
        string category
        string status
        string country
        bigint issued
        bigint retired
        date first_issuance_at
        date first_retirement_at
        jsonb sdg_goals
        jsonb additional_certifications
        date crediting_period_start
        date crediting_period_end
        bigint estimated_annual_reductions
        text description
    }

    credits {
        int id PK
        string project_id FK
        bigint quantity
        int vintage
        date transaction_date
        string transaction_type
        string retirement_beneficiary
        string registry
    }

    events {
        int id PK
        string event_type
        string project_id
        timestamp timestamp
        jsonb old_value
        jsonb new_value
    }

    project_developers {
        string id PK
        string name
        int project_count
        bigint total_issued
        bigint total_retired
        jsonb countries
        jsonb registries
    }

    project_developer_links {
        string project_id PK_FK
        string developer_id PK_FK
    }
```

## Directory Structure

```
carbon-atlas/
  api/                          # FastAPI service
    main.py                     #   App + CORS + routers
    schemas.py                  #   Pydantic response models
    db/
      database.py               #   Async engine + session
      models.py                 #   5 SQLModel tables
    routers/
      projects.py               #   /api/v1/projects
      credits.py                #   /api/v1/credits
      charts.py                 #   5 chart endpoints
      events.py                 #   /api/v1/events
      developers.py             #   /api/v1/developers
    Dockerfile                  #   Python 3.12 + uv
  pipeline/                     # ETL pipeline
    process.py                  #   Main orchestrator (~610 lines)
    extended_schema.py          #   SDGs, certs, crediting periods
    status_mapping.py           #   8-status mapping
    change_detection.py         #   Hash-based event generation
  alembic/                      # Database migrations
    env.py                      #   Migration config
  tests/                        # 86 tests
    conftest.py                 #   NullPool engine, fixtures
    test_api_endpoints.py       #   41 endpoint tests
    test_business_logic.py      #   7 business logic tests
    test_models.py              #   6 model tests
    test_reference_projects.py  #   21 regression tests (6 reference projects)
    test_sdg_parsing.py         #   12 SDG parsing tests
  app/market/                   # Next.js market pages
    layout.tsx                  #   Uses DashboardLayout (shared with MECD)
    page.tsx                    #   Dashboard: stats + 4 charts
    projects/
      page.tsx                  #   Filterable project list (server-side pagination)
      [id]/page.tsx             #   Project detail + credit transactions
  components/market/            # Market-specific components
    market-stat-cards.tsx       #   4 stat cards
    market-charts.tsx           #   4 Recharts charts
  hooks/useMarketData.ts        # TanStack Query hooks
  lib/api/market.ts             # API client
  lib/types/market.ts           # TypeScript types
  docker-compose.yml            # API + PostgreSQL
  pyproject.toml                # Python dependencies (uv)
  docs/
    screenshots/                # App screenshots
    market-explorer.md          # This file
```

## Local Development Setup

### Prerequisites

- Node.js 22+, Python 3.12+, PostgreSQL 16+
- [uv](https://docs.astral.sh/uv/) package manager for Python
- Raw registry data in `~/projects/carbon-market-explorer/data/raw/`

### 1. Database

```bash
# Option A: Docker
docker compose up db -d

# Option B: Local PostgreSQL
createdb carbon_market
createdb carbon_market_test  # for tests
```

### 2. Python Dependencies

```bash
cd carbon-atlas
uv sync --dev
```

### 3. Run Migrations

```bash
ALEMBIC_DATABASE_URL="postgresql://$USER@localhost:5432/carbon_market" uv run alembic upgrade head
```

### 4. ETL Pipeline

```bash
DATABASE_URL="postgresql+asyncpg://$USER@localhost:5432/carbon_market" \
  uv run python pipeline/process.py
```

This reads raw CSVs, harmonizes schemas, enriches with extended fields, and loads into PostgreSQL. Takes ~2 minutes for 8,900 projects and 482K credits.

### 5. Start API

```bash
DATABASE_URL="postgresql+asyncpg://$USER@localhost:5432/carbon_market" \
  uv run uvicorn api.main:app --reload --port 8000
```

API docs at http://localhost:8000/docs

### 6. Start Frontend

```bash
npm install
cp .env.example .env.local  # Set NEXT_PUBLIC_MARKET_API_URL=http://localhost:8000
npm run dev
```

Frontend at http://localhost:3000/market

### 7. Run Tests

```bash
uv run pytest tests/ -v  # 86 tests, ~3 seconds
```

## Docker Deployment

```bash
# Full stack (API + PostgreSQL)
docker compose up -d --build

# Run migrations inside container
docker compose exec api alembic upgrade head

# Run pipeline (mount data volume)
docker compose exec api python pipeline/process.py
```

### Environment Variables

| Variable | Service | Description |
|---|---|---|
| `DATABASE_URL` | api | `postgresql+asyncpg://user:pass@host:5432/carbon_market` |
| `ALEMBIC_DATABASE_URL` | api | `postgresql://user:pass@host:5432/carbon_market` (sync driver) |
| `CORS_ORIGINS` | api | Comma-separated allowed origins |
| `NEXT_PUBLIC_MARKET_API_URL` | frontend | API base URL (default: `http://localhost:8000`) |

## Cloud Deployment

### API (any container platform)

1. Build: `docker build -f api/Dockerfile -t carbon-atlas-api .`
2. Set `DATABASE_URL` to managed PostgreSQL (e.g., AWS RDS, Railway, Supabase)
3. Run migrations: `alembic upgrade head`
4. Deploy container with port 8000 exposed

### Frontend (Vercel / any Next.js host)

1. Set `NEXT_PUBLIC_MARKET_API_URL` to the deployed API URL
2. Deploy as standard Next.js app
3. Ensure API CORS allows the frontend origin

### Pipeline (scheduled job / cron)

Run `pipeline/process.py` periodically to refresh data from registry exports:
```bash
DATABASE_URL="..." python pipeline/process.py
```

The pipeline is idempotent — upserts projects and credits, generates change events for diffs.

## Features

- **5 registries** — Verra VCS, Gold Standard, ACR, CAR, ART TREES
- **8 project statuses** — crediting, registered, listed, under validation, under development, withdrawn, inactive, on hold
- **SDG goals** — full UN SDG labels (17 goals) parsed from registry data
- **Additional certifications** — CCB, CORSIA, ICVCM CCP, etc.
- **Crediting periods** — start/end dates extracted per project
- **Project descriptions** — full text where available
- **Estimated annual emission reductions** — tCO2e/year
- **Change detection** — hash-based event log tracking status changes, credit movements, and field updates
- **Developer entities** — first-class entities with aggregated stats (project count, issued/retired totals, countries, registries)
- **Reduction/removal classification** — static lookup classifying projects as reduction, impermanent removal, long-duration removal, or mixed
- **FastAPI + Next.js** — async API with server-side pagination, filtering, sorting, and 5 chart endpoints; React dashboard with TanStack Query
- **Regression tested** — 6 reference projects across lifecycle stages, 86+ tests

## Acknowledgements

The ETL pipeline uses [offsets-db-data](https://github.com/carbonplan/offsets-db-data) (MIT license) for base schema harmonization. Project type classifications are informed by the [Berkeley Voluntary Registry Offsets Database](https://gspp.berkeley.edu/research-and-impact/centers/cepp/projects/berkeley-carbon-trading-project/offsets-database).
