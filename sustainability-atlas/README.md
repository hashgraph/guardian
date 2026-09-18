# Sustainability Atlas

A standalone application that indexes Hedera Guardian blockchain data into PostgreSQL and presents it through a sustainability-focused business lens — Projects, Credits, Methodologies, Organizations.

## Architecture

```text
    Data Sources (public, no auth)
    ──────────────────────────────
    Hedera Mirror Node REST API
    IPFS Gateways
              │
    ┌─────────┼──────────────────────────────────────────────┐
    │  SUSTAINABILITY ATLAS                                  │
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
    │  │  … 4 more (see Queues)     │                        │
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

### Queues

Ten queues, each suffixed with the network at runtime (`mirror-node-topics-testnet`).
These are the names `WORKER_QUEUES` matches against (the base name, unsuffixed).

| Queue | Purpose |
|---|---|
| `mirror-node-topics` | Routine HCS topic polling — the bulk backlog |
| `mirror-node-topics-priority` | Root/registry topics and guardian-sync's event-triggered syncs, kept off the bulk backlog |
| `mirror-node-messages` | Parse & classify each HCS message |
| `ipfs-files` | Fetch VC/policy documents from IPFS |
| `policy-decode` | Unpack a published policy zip and map its schemas |
| `mirror-node-tokens` | Token metadata, NFT serials, treasury transfers |
| `mirror-node-retirements` | Retirement events from Guardian RETIRE contracts |
| `maintenance-refresh-mvs` | Refresh materialized views |
| `maintenance-build-business-views` | Rebuild registry/methodology/credit business views |
| `project-reparse` | Re-run project mapping for a VC (admin-triggered) |

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
cd sustainability-atlas
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
docker compose up -d
```

This starts Postgres, Redict, IPFS, the API, the frontend, guardian-sync, and one
all-in-one worker per network (`worker-mainnet`, `worker-testnet`).

Optional extras are behind opt-in profiles:

```bash
# BullMQ dashboard — bound to 127.0.0.1, reach it locally or via an SSH tunnel.
# It has no authentication and can retry/promote/delete any job, so it is not
# published by default. The admin API covers the same operations behind auth.
docker compose --profile monitoring up -d bull-board

# Role-partitioned workers — needs the matching overlay file, see Horizontal
# Scaling below for why a bare --profile is not enough.
docker compose -f docker-compose.yml -f docker-compose.roles-testnet.yml \
    --profile roles-testnet up -d
```

**Postgres connection ceiling.** `max_connections` is raised to 200
(`PG_MAX_CONNECTIONS`), because it — not RAM — is what limits how many workers
you can run. Every worker holds its own pool of `DB_POOL_MAX`, so keep
`(workers × DB_POOL_MAX) + api + guardian-sync` under it. A worker is only
~65 MB resident; you will exhaust connections long before memory. This setting
is not reloadable, so changing it needs `docker compose up -d postgres`.

## Horizontal Scaling

Each network runs **one all-in-one worker** by default. Two ways to scale it.

### Role-partitioned workers (shipped)

`docker-compose.yml` ships a four-role split per network, activated by a profile
plus a small overlay file:

```bash
docker compose -f docker-compose.yml -f docker-compose.roles-testnet.yml \
    --profile roles-testnet up -d --scale worker-ingest-testnet=3
```

**Why the overlay is required.** Compose starts every service that has no
`profiles:` key, whatever profile you name. The all-in-one `worker-testnet` has
no profile, so `docker compose --profile roles-testnet up -d` on its own starts
it *alongside* the four role workers and both tiers consume the same queues.
Stopping it first does not stick either — the next `up` starts it again. The
overlay is what actually takes it out of the set Compose brings up; it does
nothing else:

```yaml
services:
    worker-testnet:
        profiles: ['disabled']   # nothing activates 'disabled'
```

Running both tiers is *safe* (leader election and jobId dedup hold), but it
wastes capacity and doubles that network's mirror-node request rate, so the
overlay is the supported way in.

Switching a host that is already running the all-in-one worker? Remove it once —
with the overlay in the command it stays down:

```bash
docker compose rm -sf worker-testnet
```

| Overlay | Splits | Leaves alone |
|---|---|---|
| `docker-compose.roles-testnet.yml` | testnet → 4 roles | `worker-mainnet` |
| `docker-compose.roles-mainnet.yml` | mainnet → 4 roles | `worker-testnet` |

Pass both `-f` overlays and both `--profile` flags to split both networks; that
is 8 workers, so check the connection budget above first.

| Role | Queues | Why separate |
|---|---|---|
| ingest | `mirror-node-topics`, `-priority`, `mirror-node-messages` | The throughput path; the only role worth scaling out |
| media | `ipfs-files`, `policy-decode`, `project-reparse` | `policy-decode` blocks the event loop in JSZip and IPFS holds multi-minute sockets — isolating them keeps ingestion responsive |
| tokens | `mirror-node-tokens`, `mirror-node-retirements` | Independent unit of work |
| maintenance | `maintenance-*` | MV refresh and the business-view rebuild are full-table scans |

Only the ingest role sets `SCHEDULER_ENABLED=true`. The scheduler is
leader-elected, so replicas of it are fine; it seeds jobs at boot and owns the
repeatable schedules. Ingest deliberately has no `container_name`, which is what
allows `--scale`.

The mainnet equivalent is defined next to the testnet block and is inert until
you name its profile, so it needs no uncommenting — use
`-f docker-compose.roles-mainnet.yml --profile roles-mainnet`.

### Manual partitioning

`WORKER_QUEUES` assigns queues to an instance directly (glob patterns supported;
empty means all queues). A worker registers only the queues it consumes plus the
ones it enqueues into, so partitioning also cuts its Redis connection count.

```bash
WORKER_QUEUES=mirror-node-topics,mirror-node-messages
WORKER_QUEUES=ipfs-files
WORKER_QUEUES=mirror-node-tokens,maintenance-*
```

**Before scaling out**, check two budgets — both scale with worker count:

- **Postgres connections** — `(workers × DB_POOL_MAX) + api + guardian-sync` must
  stay under `max_connections`. Undersizing this surfaces as jobs failing with
  `timeout exceeded when trying to connect`.
- **Mirror-node rate** — the `MIRROR_NODE_RATE_*` limiters are applied *per worker
  process*, so the fleet's real request rate is that value × the number of
  workers draining the queue. Exceeding it surfaces as HTTP 429 job failures.
  Lower `WORKER_MAX_CONCURRENCY_FACTOR` when running many replicas.

See [ARCHITECTURE.md](docs/architecture/README.md) for full details on deduplication, leader election, watermark resumption, and business data mapping.

## Project Structure

```text
sustainability-atlas/
├── src/
│   ├── shared/                     Shared configuration & entities
│   │   ├── config/                 Environment, DB, Redict, BullMQ config
│   │   └── entities/               9 TypeORM entities
│   └── worker/                     Worker (NestJS + BullMQ)
│       ├── processors/             10 BullMQ job processors
│       ├── services/               2 services (Hedera, IPFS)
│       └── schedulers/             Job orchestrator with leader election
├── frontend/                       Nuxt 3 application
├── docker-compose.yml              Full stack: stores, workers, API, frontend
├── docker-compose-dev.yml          Infra only (local dev)
├── docker-compose.roles-*.yml      Overlays: split one network into 4 role workers
├── Dockerfile                      Multi-stage build
├── docs/architecture/README.md     Data pipeline deep-dive
└── .env.example                    Environment variable template
```

## Queue Worker Resilience

### IPFS multi-gateway fallback
Set `IPFS_GATEWAYS=https://gateway1.io/ipfs/,https://gateway2.io/ipfs/` (comma-separated). Per-gateway timeout: `IPFS_FETCH_TIMEOUT` (default: 180000 ms). All gateways are tried in order before a job fails.

### IPFS failure persistence

| Failure type | Examples | Retry behaviour |
|---|---|---|
| Permanent | 404, invalid CID, 410 Gone | Immediately moved to the failed set without consuming remaining retries (`UnrecoverableError`) |
| Transient | Network timeouts, 5xx errors | Retry per the BullMQ `attempts` config (5x for IPFS) |

All failures are persisted to the `ipfs_fetch_failure` table with error category, attempt count, and last error text. On subsequent successful fetch the failure record is removed and an `ipfs-fetch-recovered` event is published.

### Manual retry budget
Via the API, failed jobs can be manually retried. The `manualRetryCount` column in `ipfs_fetch_failure` tracks how many times a CID has been manually re-queued, allowing the API layer to enforce retry budgets (e.g. max 3 manual retries before requiring `{ force: true }`).

### In-process autoscaler
`QueueAutoscalerService` adjusts BullMQ worker concurrency at runtime without restarting the process. Concurrency bounds are:

| Bound | Value |
|---|---|
| Minimum | Startup baseline from `getQueueConfigs()` (env-var controlled, e.g. `WORKER_IPFS_CONCURRENCY=3`) |
| Maximum | `WORKER_<QUEUE>_MAX_CONCURRENCY` env var, or `max(baseline × WORKER_MAX_CONCURRENCY_FACTOR, baseline + 4)` if unset (factor defaults to 4) |

Example env var names (replace hyphens with underscores, uppercase):
- `WORKER_IPFS_FILES_MAX_CONCURRENCY`
- `WORKER_MIRROR_NODE_TOPICS_MAX_CONCURRENCY`

Scaling rules, checked every 30s in **every** worker process:

| Rule | Condition | Action |
|---|---|---|
| Scale up | `backlog > 100` | `concurrency += 2` (immediate) |
| Scale down | `backlog < 10` and `active < 50% concurrency` for 2 consecutive cycles | `concurrency -= 1` |

`backlog` counts **waiting + prioritized**. BullMQ keeps priority-carrying jobs
in a separate structure, so a queue whose producers all set a priority reports
`waiting = 0` no matter how deep it is — counting only `waiting` makes the
busiest queues invisible to the autoscaler.

This is deliberately **not** leader-elected. `Worker.concurrency` is a property
of one process, so a single elected leader could only ever scale its own
workers and every other replica would sit pinned at its baseline. Each replica
therefore decides for itself, which makes the ceiling **per replica**: N replicas
can reach N × `maxConcurrency` in total. Lower `WORKER_MAX_CONCURRENCY_FACTOR`
(default 4) when scaling out so the fleet's combined ceiling still fits the
Postgres pool and the mirror-node rate budget.

> **NOTE:** For production load, scale horizontally (more worker containers with `WORKER_QUEUES` partitioning). In-process scaling is a smoothing layer only.

### Mirror-node rate limiting
Concurrency alone is the wrong lever against the mirror node: raising it to drain
a backlog also multiplies the request rate, and the mirror node answers with HTTP
429, which fails the job. The queues that call it carry an explicit per-second
budget (`MIRROR_NODE_RATE_TOPIC`, `_TOPIC_PRIORITY`, `_TOKEN`, `_RETIRE`),
independent of how many jobs run concurrently. BullMQ applies a limiter per
worker process — see the fleet-rate caveat under Horizontal Scaling.

### Liveness reconciler
Ingestion is chain-driven: a topic keeps syncing only because the previous job
enqueued the next one. When a chain dies — exhausted retries, a job lost to a
Redis restart — nothing else restarts it. A leader-gated reconciler runs every
`RECONCILE_INTERVAL_MS` (default 5 min), finds topics with no job on either topic
queue and messages stranded at `LOADED`, and re-queues them. Rescue counts
trending to zero is the signal that ingestion is healthy.

### Producer backpressure
Redict runs `maxmemory-policy noeviction`, which is correct for BullMQ but means
that at `maxmemory` it refuses writes: `queue.add()` throws and that unit of work
is lost rather than degraded. The bulk producers (boot backfills, a decoded
policy's whole-subtree VC fetch, admin reparse-everything) check Redis headroom
and queue depth first and defer instead — the reconciler and the next boot pick
the work back up. Tuned via `REDIS_HEADROOM_THRESHOLD_PCT`, `MAX_QUEUE_DEPTH`
and `BACKFILL_BATCH`.

### Nginx / reverse proxy (SSE)
Add `proxy_buffering off;` to the nginx location block serving `/api/v1/*/queues/events` to prevent SSE buffering.

## Queue Operations

### Inspecting and maintaining queues

```bash
npx tsx scripts/queue-maintenance.ts report              # memory, clients, per-queue depth
npx tsx scripts/queue-maintenance.ts trim-events 1000    # trim BullMQ event streams
npx tsx scripts/queue-maintenance.ts clean 24 168        # drop completed >24h / failed >168h
```

`report` is read-only and safe at any time — run it before and after a rollout.
`trim-events` and `clean` only remove observability and history data; they never
touch waiting, delayed or active jobs, so no pending work is lost.

Note that `report` shows **prioritized** separately from **waiting**, for the
reason given under the autoscaler above: a queue whose producers set a job
priority reads as `waiting = 0` regardless of its real depth.

### Admin endpoints

All are `@AdminWrite` (JWT + admin role + CSRF) except the read-only one:

| Endpoint | Purpose |
|---|---|
| `GET  /:network/queues/redis-health` | Memory used vs `maxmemory`, eviction policy, client count (admin-read) |
| `POST /:network/queues/:baseName/pause` / `/resume` | Stop workers picking up new jobs while a backlog drains |
| `POST /:network/queues/:baseName/clean` | Remove finished jobs to reclaim Redis memory |
| `POST /:network/queues/:baseName/retry-all-failed` | Retry failed jobs, honouring the manual retry budget |

Watch `redis-health` alongside queue depth: at `maxmemory` Redict starts refusing
writes, so job production fails outright rather than degrading.

### Topic poll scheduling

`TOPIC_POLL_MODE` selects how a topic's next poll is scheduled:

- `chain` (default) — each topic-sync job enqueues its own successor. Simple and
  battle-tested, but it parks one delayed BullMQ job per known topic forever, so
  Redis load scales with how many topics *exist* rather than with activity.
- `dispatcher` — `topic_cache.nextPollAt` is the schedule and a leader-side
  dispatcher releases only the topics that are due, so the queue holds
  *O(due topics)* instead of *O(all topics)*.

Both modes maintain `nextPollAt`, so switching needs no backfill and flipping
back is lossless. Before switching, confirm the schedule is populated:

```sql
SELECT count(*) FILTER (WHERE "nextPollAt" IS NULL) FROM topic_cache
 WHERE status <> 'DISABLED';
```

## Documentation

- [ARCHITECTURE.md](docs/architecture/README.md) — Data pipeline architecture, deduplication, leader election, horizontal scaling, business data mapping
- [.env.example](.env.example) — All environment variables with descriptions


## DB and IPFS Snapshot

A pre-built database and IPFS snapshot can be restored instead of re-indexing from Hedera, which
takes considerably longer. See [snapshot/README.md](snapshot/README.md) for the export and import
scripts and the `docker-compose` bind-mount they use.

## License

Apache-2.0 (same as Guardian)
