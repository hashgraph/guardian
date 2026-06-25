# CLAUDE.md — Carbon Atlas Market API

## Overview

FastAPI service providing unified carbon credit registry data (Verra VCS + Gold Standard). Async throughout — asyncpg for PostgreSQL, SQLModel/SQLAlchemy ORM. The API serves the Market Explorer frontend at `/market`.

**Stack:** FastAPI | SQLModel | asyncpg | PostgreSQL 16 | Alembic | uv

## Architecture

```
api/
  main.py              # FastAPI app, CORS, router registration, lifespan
  schemas.py           # Pydantic response models (ProjectResponse, PaginatedResponse, etc.)
  db/
    database.py        # Async engine + session factory (DATABASE_URL env var)
    models.py          # 5 SQLModel tables: Project, Credit, Event, ProjectDeveloper, ProjectDeveloperLink
  routers/
    projects.py        # GET /api/v1/projects, GET /api/v1/projects/{id}
    credits.py         # GET /api/v1/credits (filterable by project, type, vintage)
    charts.py          # 5 chart endpoints (vintage, time-series, country, category, status)
    events.py          # GET /api/v1/events (change detection log)
    developers.py      # GET /api/v1/developers, /developers/{id}, /developers/{id}/projects
  Dockerfile           # Python 3.12 slim + uv
```

## Data Model

5 tables:

| Table | PK | Key Fields | Notes |
|---|---|---|---|
| `projects` | `project_id` (str) | 17 harmonized fields + 8 extended (SDGs, certs, crediting period, description, est. annual reductions) | JSONB for protocol, sdg_goals, additional_certifications |
| `credits` | `id` (serial) | project_id (FK), quantity (BigInt), vintage, transaction_type, transaction_date | ~482K rows |
| `events` | `id` (serial) | event_type, project_id, old_value/new_value (JSONB) | Change detection log |
| `project_developers` | `id` (str slug) | name, project_count, total_issued/retired, countries/registries (JSONB) | Aggregated from proponent strings |
| `project_developer_links` | composite (project_id, developer_id) | M:N junction | |

## Key Patterns

- **Session dependency:** `get_session()` yields `AsyncSession`, overridden in tests with `NullPool` engine
- **Project detail:** Serializes columns manually (`{c.key: getattr(...)}`) to avoid lazy-loading the `developers` relationship
- **Pagination:** All list endpoints return `PaginatedResponse[T]` with total, page, page_size, total_pages
- **Sorting:** `sort=-issued` (prefix `-` for desc, `+` or none for asc), mapped to column via `getattr(Model, field)`
- **Stats:** Single SQL query with `func.count`, `func.sum`, `func.count(distinct(...))` — optionally filtered by registry/category

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://carbon:carbon@localhost:5432/carbon_market` | Async connection string |
| `ALEMBIC_DATABASE_URL` | — | Sync connection string for migrations (psycopg2 driver) |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |

## Development

```bash
# Start API locally (uses local PostgreSQL)
DATABASE_URL="postgresql+asyncpg://$USER@localhost:5432/carbon_market" uv run uvicorn api.main:app --reload --port 8000

# Run tests (uses carbon_market_test database)
uv run pytest tests/ -v

# Run migrations
ALEMBIC_DATABASE_URL="postgresql://$USER@localhost:5432/carbon_market" uv run alembic upgrade head

# Docker (API + PostgreSQL)
docker compose up -d
```

## Testing

Tests in `tests/` — 86 tests using pytest-asyncio + httpx ASGI transport.

- `conftest.py` — NullPool engine, session override, auto-truncate after each test
- `test_api_endpoints.py` — Full endpoint coverage (CRUD, filters, pagination, charts)
- `test_business_logic.py` — Stats aggregation, vintage calculations
- `test_models.py` — ORM model creation, BigInt quantities
- `test_reference_projects.py` — 6 reference projects across lifecycle stages (regression)
- `test_sdg_parsing.py` — SDG label parsing for both Verra and Gold Standard formats

**Important:** Tests use `carbon_market_test` database. Tables are auto-created/dropped per session. Each test auto-truncates all tables.

## API Endpoints

All endpoints prefixed with `/api/v1/`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/projects` | List projects (paginated, filterable by registry/status/category/country/search) |
| GET | `/api/v1/projects/{id}` | Project detail with developers |
| GET | `/api/v1/credits` | List credit transactions (filterable by project_id/type/vintage) |
| GET | `/api/v1/stats` | Dashboard stats (totals, retirement rate, by_registry, by_category) |
| GET | `/api/v1/charts/issuances-by-vintage` | Bar chart data |
| GET | `/api/v1/charts/credits-over-time` | Time series data |
| GET | `/api/v1/charts/projects-by-country` | Horizontal bar chart data |
| GET | `/api/v1/charts/projects-by-category` | Donut chart data |
| GET | `/api/v1/charts/status-breakdown` | Status bar chart data |
| GET | `/api/v1/events` | Change detection events |
| GET | `/api/v1/developers` | List developers (searchable, paginated) |
| GET | `/api/v1/developers/{id}` | Developer detail |
| GET | `/api/v1/developers/{id}/projects` | Developer's projects |
| GET | `/health` | Health check |
