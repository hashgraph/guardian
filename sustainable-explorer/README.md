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

## Queue Worker Resilience

### IPFS multi-gateway fallback
Set `IPFS_GATEWAYS=https://gateway1.io/ipfs/,https://gateway2.io/ipfs/` (comma-separated). Per-gateway timeout: `IPFS_FETCH_TIMEOUT` (default: 180000 ms). All gateways are tried in order before a job fails.

### IPFS failure persistence
Permanent failures (404, invalid CID, 410 Gone) are immediately moved to the failed set without consuming remaining retries (`UnrecoverableError`). Transient failures (network timeouts, 5xx errors) retry per the BullMQ `attempts` config (5x for IPFS). All failures are persisted to the `ipfs_fetch_failure` table with error category, attempt count, and last error text. On subsequent successful fetch the failure record is removed and an `ipfs-fetch-recovered` event is published.

### Manual retry budget
Via the API, failed jobs can be manually retried. The `manualRetryCount` column in `ipfs_fetch_failure` tracks how many times a CID has been manually re-queued, allowing the API layer to enforce retry budgets (e.g. max 3 manual retries before requiring `{ force: true }`).

### In-process autoscaler
`QueueAutoscalerService` adjusts BullMQ worker concurrency at runtime without restarting the process. Concurrency bounds are:
- Minimum: startup baseline from `getQueueConfigs()` (env-var controlled, e.g. `WORKER_IPFS_CONCURRENCY=3`)
- Maximum: `WORKER_<QUEUE>_MAX_CONCURRENCY` env var, or `max(baseline * 4, baseline + 4)` if unset

Example env var names (replace hyphens with underscores, uppercase):
- `WORKER_IPFS_FILES_MAX_CONCURRENCY`
- `WORKER_MIRROR_NODE_TOPICS_MAX_CONCURRENCY`

Scaling rules (checked every 30s, leader-elected per network):
- Scale up: `waiting > 100` → `concurrency += 2` (immediate)
- Scale down: `waiting < 10` and `active < 50% concurrency` for 2 consecutive cycles → `concurrency -= 1`

**For production load, scale horizontally** (more worker containers with `WORKER_QUEUES` partitioning). In-process scaling is a smoothing layer only.

### Nginx / reverse proxy (SSE)
Add `proxy_buffering off;` to the nginx location block serving `/api/v1/*/queues/events` to prevent SSE buffering.

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Data pipeline architecture, deduplication, leader election, horizontal scaling, business data mapping
- **[.env.example](.env.example)** — All environment variables with descriptions


## DB and IPFS Snapshot
https://xeptagoncom-my.sharepoint.com/:u:/g/personal/palinda_xeptagon_com/IQDgenk8E_kZS4H29G2iumB_AafSq97wjvL8_ZliYnbs0U0?e=1d3GId
wget --content-disposition --trust-server-names \
"https://xeptagoncom-my.sharepoint.com/:u:/g/personal/palinda_xeptagon_com/IQDgenk8E_kZS4H29G2iumB_AafSq97wjvL8_ZliYnbs0U0?e=1d3GId&download=1"

## License

Apache-2.0 (same as Guardian)
