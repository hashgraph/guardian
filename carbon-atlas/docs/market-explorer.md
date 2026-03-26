# Market Explorer — Architecture & Deployment Guide

The Market Explorer extends Carbon Atlas with a comprehensive carbon market data service covering **Verra VCS**, **Gold Standard**, **ACR**, **CAR**, and **ART TREES** registries. It provides a searchable, filterable dashboard of projects and credit transactions across all major voluntary carbon registries.

## Screenshots

### Market Overview
![Market Overview](screenshots/market-overview.png)

### All Projects
![All Projects](screenshots/market-projects-list.png)

### Project Detail
![Project Detail](screenshots/market-project-detail.png)

## Architecture

```
Raw CSVs (5 registries)
    │
    ▼
ETL Pipeline (Python)
    ├── offsets-db-data ── Harmonize + validate
    ├── Extended Schema ── SDGs, certs, crediting periods
    ├── Status Mapping ─── 8 canonical statuses
    └── Change Detection ─ Hash-based event generation
    │
    ▼
PostgreSQL 16 (5 tables)
    │
    ▼
FastAPI (14 endpoints)
    │
    ▼
Next.js 16 + React 19 (TanStack Query + shadcn/ui)
```

## Data Flow

```
Raw CSVs ──► Harmonize ──► Enrich (SDGs, certs) ──► Map statuses ──► Detect changes ──► PostgreSQL
                                                                                            │
Frontend ◄── PaginatedResponse JSON ◄── SELECT with filters ◄── FastAPI ◄──────────────────┘
```

## Data Model

```
projects ──┬── credits (1:N via project_id)
            ├── events (1:N via project_id)
            └── project_developer_links (M:N) ── project_developers
```

| Table | Key columns |
|-------|-------------|
| `projects` | project_id (PK), name, registry, status, country, category, issued, retired, sdg_goals, crediting_period_start/end |
| `credits` | id (PK), project_id (FK), quantity, vintage, transaction_date, transaction_type, registry |
| `events` | id (PK), event_type, project_id, timestamp, old_value, new_value |
| `project_developers` | id (PK), name, project_count, total_issued, total_retired, countries, registries |
| `project_developer_links` | project_id (PK/FK), developer_id (PK/FK) |

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
