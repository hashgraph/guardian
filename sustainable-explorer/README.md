# Sustainable Explorer

A standalone application that indexes Hedera Guardian blockchain data into PostgreSQL and presents it through a sustainability-focused business lens — Projects, Credits, Methodologies, Organizations.

## Architecture

```
    Data Sources (public, no auth)
    ──────────────────────────────
    Hedera Mirror Node REST API
    IPFS Gateways
              │
    ┌─────────┼──────────────────────────────────────────────┐
    │  SUSTAINABLE EXPLORER                                  │
    │         ▼                                              │
    │  ┌────────────────────────────┐                        │
    │  │  Worker (BullMQ)           │                        │
    │  │                            │                        │
    │  │  mirror-node-topics        │  ← Fetch HCS messages  │
    │  │  mirror-node-messages      │  ← Parse & classify    │
    │  │  mirror-node-tokens        │  ← Token metadata      │
    │  │  ipfs-files                │  ← IPFS documents      │
    │  │  maintenance-refresh-mvs   │  ← Materialized views  │
    │  │  maintenance-build-bv      │  ← Business mapping    │
    │  └───────────┬────────────────┘                        │
    │              │                                         │
    │      ┌───────▼─────────────────────────────┐           │
    │      │  PostgreSQL 16    │    Redict 7      │          │
    │      │  Tables + MVs     │    BullMQ queues │          │
    │      │  Business views   │    Leader lock   │          │
    │      └───────────────────┴─────────────────┘           │
    └────────────────────────────────────────────────────────┘
              │
              ▼
    ┌────────────────────────────────────────────────────────┐
    │  Frontend (Nuxt 3 + Vue 3)              Port 3000     │
    └────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Worker | NestJS 11, TypeScript 5.5+, BullMQ 5 |
| Database | PostgreSQL 16 (materialized views, JSONB) |
| Cache / Queues | Redict 7 (Redis-compatible) |
| ORM | TypeORM 0.3 |
| Frontend | Vue 3, Nuxt 3 (SSR), Tailwind CSS 4 |
| Runtime | Node.js 20 LTS |

## Local Development

### 1. Start infrastructure (Postgres + Redict only)

```bash
cd sustainable-explorer
cp .env.example .env
yarn infra:up
```

This starts only PostgreSQL and Redict via `docker-compose-dev.yml`. Everything else runs locally.

### 2. Start the worker

```bash
yarn install
yarn dev:worker    # hot-reload mode
```

The worker connects to Hedera Mirror Node (public, no auth needed) and starts syncing data into PostgreSQL.

### 3. Start the frontend (separate terminal)

```bash
cd frontend
yarn install
npx nuxt prepare
yarn dev
```

### Services

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Nuxt 3 dev server |
| PostgreSQL | localhost:5432 | User: `explorer` / Pass: `explorer_password` |
| Redict | localhost:6379 | Redis-compatible, no password |

### Useful commands

```bash
yarn infra:up       # Start Postgres + Redict containers
yarn infra:down     # Stop containers (keep data)
yarn infra:reset    # Stop, delete volumes, restart fresh
yarn dev:worker     # Worker with hot-reload
yarn build          # Production build
yarn start:worker   # Production worker (requires build first)
```

## Full Stack Docker

To run everything in containers (no local Node.js needed):

```bash
docker-compose up -d
```

## Horizontal Scaling

The worker supports horizontal scaling via the `WORKER_QUEUES` environment variable. Each instance processes only its assigned queues:

```bash
# Instance 1: HCS message ingestion (scale to handle backlog)
WORKER_QUEUES=mirror-node-topics,mirror-node-messages

# Instance 2: IPFS fetching (I/O-bound, benefits most from scaling)
WORKER_QUEUES=ipfs-files

# Instance 3: Token sync + maintenance (single instance)
WORKER_QUEUES=mirror-node-tokens,maintenance-*
```

Glob patterns are supported. If `WORKER_QUEUES` is empty, all queues are processed (single-instance mode).

See [ARCHITECTURE.md](ARCHITECTURE.md) for full details on deduplication, leader election, watermark resumption, and business data mapping.

## Project Structure

```
sustainable-explorer/
├── src/
│   ├── shared/                     Shared configuration & entities
│   │   ├── config/                 Environment, DB, Redict, BullMQ config
│   │   └── entities/               9 TypeORM entities
│   └── worker/                     Worker (NestJS + BullMQ)
│       ├── processors/             6 BullMQ job processors
│       ├── services/               2 services (Hedera, IPFS)
│       └── schedulers/             Job orchestrator with leader election
├── frontend/                       Nuxt 3 application
├── docker-compose.yml              PostgreSQL + Redict + Worker
├── Dockerfile                      Multi-stage build
├── ARCHITECTURE.md                 Data pipeline deep-dive
└── .env.example                    Environment variable template
```

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Data pipeline architecture, deduplication, leader election, horizontal scaling, business data mapping
- **[.env.example](.env.example)** — All environment variables with descriptions

## License

Apache-2.0 (same as Guardian)
