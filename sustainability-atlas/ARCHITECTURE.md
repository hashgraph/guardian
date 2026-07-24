# Sustainability Atlas — Data Pipeline Architecture

This document describes how the Sustainability Atlas worker ingests data from the Hedera Mirror Node and IPFS, maps it to business entities, and supports horizontal scaling and multi-network querying.

## High-Level Topology

```
                 ┌──────────────────────────────────────────┐
                 │              FRONTEND (Nuxt 3)           │
                 │  ┌──────────────────────────────────┐    │
                 │  │  Network selector (topbar)       │    │
                 │  │  → useNetwork()                  │    │
                 │  └──────────────────────────────────┘    │
                 └─────────────────┬────────────────────────┘
                                   │ GET /api/v1/{network}/registries
                                   ▼
                 ┌──────────────────────────────────────────┐
                 │        API (Single NestJS process)       │
                 │                                          │
                 │  - NetworkDataSourceRegistry             │
                 │  - One TypeORM DataSource per network    │
                 │  - Path param selects the DataSource     │
                 │                                          │
                 │  RegistryRepository (abstract)           │
                 │    └── PgRegistryRepository (PG impl)    │
                 └────┬─────────────────────────┬───────────┘
                      │                         │
                      ▼                         ▼
       ┌──────────────────────────┐   ┌──────────────────────────┐
       │ mainnet_sustainable_     │   │ testnet_sustainable_     │
       │ explorer (PostgreSQL)    │   │ explorer (PostgreSQL)    │
       └──────────▲───────────────┘   └──────────▲───────────────┘
                  │                              │
                  │ writes                       │ writes
                  │                              │
       ┌──────────┴──────────┐         ┌─────────┴───────────┐
       │ Worker              │         │ Worker              │
       │ HEDERA_NET=mainnet  │         │ HEDERA_NET=testnet  │
       └─────────▲───────────┘         └─────────▲───────────┘
                 │                               │
                 │ Mirror Node REST              │ Mirror Node REST
                 │ + IPFS gateways               │ + IPFS gateways
                 ▼                               ▼
          ┌─────────────┐                  ┌─────────────┐
          │   Hedera    │                  │   Hedera    │
          │   mainnet   │                  │   testnet   │
          └─────────────┘                  └─────────────┘
```

**Key design decisions:**

- **One database per network.** Each worker writes only to its own network's database (e.g., `mainnet_sustainable_explorer`). This provides physical isolation, trivial per-network backups, and perfect query latency (small per-network tables).
- **One worker process per network.** Workers are scoped to a single `HEDERA_NET` and are completely isolated from each other.
- **Single API serves all networks.** The API is configured with `HEDERA_NETWORKS=mainnet,testnet` and maintains one TypeORM DataSource per network, routing requests to the right database based on the URL path `/api/v1/{network}/...`.

## Pipeline Overview

```
Hedera Mirror Node REST API          IPFS Gateways
(public, no auth)                    (public, multi-gateway fallback)
         │                                    │
         ▼                                    │
┌────────────────────────┐                    │
│ 1. TopicSyncProcessor  │                    │
│    mirror-node-topics  │                    │
│    Fetches HCS messages│                    │
│    → message_cache     │                    │
│    → topic_cache       │                    │
└──────────┬─────────────┘                    │
           │                                  │
           ▼                                  │
┌────────────────────────────┐                │
│ 2. MessageProcessProcessor │                │
│    mirror-node-messages    │                │
│    Base64 decode → JSON    │                │
│    Extract type, CIDs,     │                │
│    child topics, tokens    │                │
│    → message table         │                │
└───┬──────────┬─────────┬───┘                │
    │          │         │                    │
    │          │         ▼                    │
    │          │  ┌──────────────────┐        │
    │          │  │ 5. TokenSync     │        │
    │          │  │ mirror-node-tokens│       │
    │          │  │ Token metadata   │        │
    │          │  │ + NFT serials    │        │
    │          │  │ → token_cache    │        │
    │          │  │ → nft_cache      │        │
    │          │  └──────────────────┘        │
    │          │                              │
    │          ▼                              │
    │   ┌─────────────────┐                   │
    │   │ Recurse: new     │                  │
    │   │ child topics     │                  │
    │   │ discovered from  │                  │
    │   │ message options  │                  │
    │   │ → mirror-node-   │                  │
    │   │   topics queue   │                  │
    │   └─────────────────┘                   │
    │                                         │
    ▼                                         ▼
┌─────────────────────────────────────────────────┐
│ 3. IpfsFetchProcessor                           │
│    ipfs-files                                   │
│    Fetches content from IPFS gateways           │
│    Parses JSON documents                        │
│    → ipfs_files table                           │
│    → updates message.documents                  │
│    → publishes Redict event                     │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│ 4. BusinessViewBuilderProcessor                 │
│    maintenance-build-business-views (every 5min)│
│                                                 │
│    Maps raw message types → business entities:  │
│      Policy          → METHODOLOGY              │
│      Standard Registry → ORGANIZATION           │
│      Token           → CREDIT                   │
│      VC-Document     → PROJECT                  │
│                                                 │
│    → business_view table                        │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│ 5. MvRefreshProcessor                           │
│    maintenance-refresh-mvs (every 60s)          │
│    REFRESH MATERIALIZED VIEW CONCURRENTLY       │
│    → mv_registry_activity                       │
│    → mv_policy_activity                         │
│    → mv_topic_activity                          │
│    → mv_landing_analytics                       │
└─────────────────────────────────────────────────┘
```

## Queue Details

| Queue | Concurrency | Purpose |
|-------|-------------|---------|
| `mirror-node-topics` | 5 | Fetch HCS messages from Mirror Node by topic ID |
| `mirror-node-messages` | 10 | Decode, parse, and classify raw messages |
| `mirror-node-tokens` | 2 | Fetch token metadata and NFT serials |
| `ipfs-files` | 3 | Fetch documents from IPFS gateways |
| `maintenance-refresh-mvs` | 1 | Refresh PostgreSQL materialized views |
| `maintenance-build-business-views` | 5 | Map raw messages to business entities |

## Deduplication

BullMQ's `jobId` parameter prevents duplicate work across all workers. Every job gets a deterministic ID derived from its input data:

| Job type | jobId format | Example |
|----------|-------------|---------|
| Topic sync | `topic-{topicId}-{fromSeq}` | `topic-0.0.12345-847` |
| Message parse | `msg-{consensus_timestamp}` | `msg-1710400000.123456789` |
| IPFS fetch | `ipfs-{cid}` | `ipfs-QmPzY9Tzi...` |
| Token sync | `token-{tokenId}` or `token-{tokenId}-{fromSerial}` | `token-0.0.48291-300` |
| Initial topic (startup) | `topic-{topicId}-init` | `topic-0.0.12345-init` |
| Initial token (startup) | `token-{tokenId}-init` | `token-0.0.48291-init` |

### How it works

When multiple worker instances start simultaneously, they all read from the same `topic_cache` table and try to enqueue the same jobs. BullMQ checks the `jobId` in Redict — if a job with that ID already exists (pending, active, or recently completed), the duplicate is silently ignored.

```
Worker-1: enqueue topic-0.0.12345-init  →  OK (first)
Worker-2: enqueue topic-0.0.12345-init  →  ignored (already exists)
Worker-3: enqueue topic-0.0.12345-init  →  ignored (already exists)
Result: topic 0.0.12345 is synced exactly once
```

### Database-level idempotency

All writes use `INSERT ... ON CONFLICT ... DO UPDATE`, so even in edge cases where two workers process overlapping data, the result is the same:

```sql
-- message_cache: keyed by consensusTimestamp
ON CONFLICT ("consensusTimestamp") DO UPDATE SET message = EXCLUDED.message, ...

-- message: keyed by consensusTimestamp
ON CONFLICT ("consensusTimestamp") DO UPDATE SET type = EXCLUDED.type, ...

-- token_cache: keyed by tokenId
ON CONFLICT ("tokenId") DO UPDATE SET name = EXCLUDED.name, ...

-- ipfs_files: keyed by cid
ON CONFLICT (cid) DO NOTHING

-- business_view: keyed by (source_timestamp, view_type)
ON CONFLICT (source_timestamp, view_type) DO UPDATE SET ...
```

### IPFS double-check

The IPFS processor has an additional pre-fetch check to avoid unnecessary HTTP requests:

```typescript
const existing = await this.dataSource.query(
    `SELECT id FROM ipfs_files WHERE cid = $1 LIMIT 1`, [cid]
);
if (existing.length > 0) return; // already fetched, skip
```

## Leader Election

Repeating maintenance jobs (MV refresh every 60s, business view build every 5min) must be scheduled by exactly one instance. The scheduler uses a Redict-based distributed lock.

### Mechanism

```
SET se:scheduler:leader {instance_id} EX 30 NX
```

- `NX` — only set if the key does not exist (atomic acquire)
- `EX 30` — key expires in 30 seconds (auto-release on crash)
- The leader renews the lock every 15 seconds via `EXPIRE`

### Lifecycle

```
┌─ Startup ──────────────────────────────────────────────────┐
│                                                            │
│  Worker-1: SET NX → OK           (becomes leader)          │
│  Worker-2: SET NX → null         (not leader)             │
│  Worker-3: SET NX → null         (not leader)             │
│                                                            │
│  Worker-1: schedules repeating MV refresh + business view  │
│  Worker-2: skips repeating job scheduling                  │
│  Worker-3: skips repeating job scheduling                  │
│                                                            │
│  All workers: enqueue initial topic/token syncs            │
│  (idempotent via jobId — no duplicates)                    │
└────────────────────────────────────────────────────────────┘

┌─ Running ──────────────────────────────────────────────────┐
│                                                            │
│  Every 15 seconds:                                         │
│    Worker-1: EXPIRE se:scheduler:leader 30  (renew TTL)    │
│    Worker-2: SET NX → null  (leader still active)          │
│    Worker-3: SET NX → null  (leader still active)          │
└────────────────────────────────────────────────────────────┘

┌─ Leader crash ─────────────────────────────────────────────┐
│                                                            │
│  Worker-1 crashes at T=0                                   │
│  T+30s: Redict key expires automatically                   │
│  T+30s to T+45s: Worker-2's next renewal attempt           │
│    Worker-2: SET NX → OK  (becomes new leader)             │
│    Worker-2: schedules repeating jobs                      │
└────────────────────────────────────────────────────────────┘

┌─ Shutdown ─────────────────────────────────────────────────┐
│                                                            │
│  Worker-1 receives SIGTERM                                 │
│  Worker-1: DEL se:scheduler:leader  (release immediately)  │
│  Another worker acquires within 15s                        │
└────────────────────────────────────────────────────────────┘
```

### What each role does

| Action | Leader | Non-leader |
|--------|--------|------------|
| Schedule repeating MV refresh | Yes | No |
| Schedule repeating business view build | Yes | No |
| Enqueue initial topic syncs from cache | Yes | Yes (deduplicated) |
| Enqueue initial token syncs from cache | Yes | Yes (deduplicated) |
| Process jobs from assigned queues | Yes | Yes |

## Horizontal Scaling

### WORKER_QUEUES environment variable

Each worker instance can be configured to process only specific queues via the `WORKER_QUEUES` environment variable:

```bash
# Process all queues (default, single-instance mode)
WORKER_QUEUES=

# Process only topic and message queues
WORKER_QUEUES=mirror-node-topics,mirror-node-messages

# Process only IPFS fetching
WORKER_QUEUES=ipfs-files

# Process all maintenance queues (glob pattern)
WORKER_QUEUES=maintenance-*

# Process all mirror-node queues (glob pattern)
WORKER_QUEUES=mirror-node-*
```

### How it works internally

```typescript
// WorkerModule.register() — called at startup
const activeQueues = getActiveQueues();  // reads WORKER_QUEUES env

// ALL queues are registered (so processors can enqueue to ANY queue)
BullModule.registerQueue(...allQueueNames.map(name => ({ name })));

// But only MATCHING processors are instantiated
const activeProcessors = activeQueues
    .map(q => PROCESSOR_MAP[q])
    .filter(Boolean);

// Scheduler only runs on instances that handle data ingestion queues
const includeScheduler = activeQueues.some(q => q.startsWith('mirror-node'));
```

Key: all queues are always registered so any processor can enqueue jobs to any queue. But only processors for active queues actually listen for and process jobs.

### Example deployment

```yaml
# docker-compose.scale.yml
services:
  worker-ingest:
    image: sustainability-atlas-worker
    environment:
      WORKER_QUEUES: mirror-node-topics,mirror-node-messages
    deploy:
      replicas: 3

  worker-ipfs:
    image: sustainability-atlas-worker
    environment:
      WORKER_QUEUES: ipfs-files
      WORKER_IPFS_CONCURRENCY: 10
    deploy:
      replicas: 5

  worker-tokens:
    image: sustainability-atlas-worker
    environment:
      WORKER_QUEUES: mirror-node-tokens
    deploy:
      replicas: 1

  worker-maintenance:
    image: sustainability-atlas-worker
    environment:
      WORKER_QUEUES: maintenance-*
    deploy:
      replicas: 1
```

**Scaling guidelines:**

| Queue | Scale when... | Notes |
|-------|--------------|-------|
| `mirror-node-topics` | Many topics to sync | Bounded by Mirror Node rate limits |
| `mirror-node-messages` | Large message backlog | CPU-bound (JSON parsing) |
| `ipfs-files` | IPFS queue growing | I/O-bound, most benefit from scaling |
| `mirror-node-tokens` | Many NFT tokens | Bounded by Mirror Node rate limits |
| `maintenance-*` | Never needs scaling | Leader-elected, runs periodically |

## Watermark-Based Resumption

The system tracks sync progress so it can resume after restarts without reprocessing:

### topic_cache

```
topicId: 0.0.12345
messages: 847          ← last processed sequence number
hasNext: true          ← more messages available
status: SYNCED
```

On restart: enqueues `{topicId: '0.0.12345', fromSequenceNumber: 847}` → resumes from message 848.

### token_cache

```
tokenId: 0.0.48291
serialNumber: 300      ← last processed NFT serial
hasNext: true          ← more serials available
```

On restart: enqueues `{tokenId: '0.0.48291', fromSerial: 300}` → resumes from serial 301.

### Pagination pattern

Both topic and token processors use self-enqueuing pagination:

```
Processor fetches 100 items (Mirror Node page limit)
  ├─ If < 100 items: done, set hasNext = false
  └─ If = 100 items: more data exists
       → Update watermark
       → Self-enqueue with new offset + 100ms delay
       → Repeat until < 100 items
```

## Business Data Mapping

The `BusinessViewBuilderProcessor` runs every 5 minutes and translates raw HCS message types into business-domain entities:

| HCS Message Type | Business View Type | What it represents |
|-----------------|-------------------|-------------------|
| `Policy` | `METHODOLOGY` | Carbon credit methodology |
| `Standard Registry` | `REGISTRY` | Registry organization (Verra, Gold Standard, etc.) |
| `Token` | `CREDIT` | Carbon credit token |
| `VC-Document` | `PROJECT` | Sustainability project |

The mapping query joins the `message` table with `token_cache` to enrich credit data, then upserts into `business_view` with the translated `view_type`.

### Extensibility

This mapping is designed for extension. When Guardian API integration is added later, it will write to the same `message` table with `dataSource = 'guardian_api'`. The business view builder will process those messages identically — no changes needed to the mapping layer. The `message.dataSource` field tracks provenance:

| Value | Meaning |
|-------|---------|
| `mirror_node` | Data came from Hedera Mirror Node |
| `guardian_api` | Data came from Guardian REST API |
| `both` | Independently confirmed by both sources |

## Multi-Network Architecture

The system supports multiple Hedera networks simultaneously (mainnet, testnet, previewnet) by running **one worker process per network** and a **single API that connects to all configured networks' databases**.

### Database naming

Each network gets its own database:

```
{GUARDIAN_ENV}_{network}_{DB_DATABASE}
```

Example with `GUARDIAN_ENV=test`, `DB_DATABASE=sustainable_explorer`:

| Network | Database name |
|---------|---------------|
| mainnet | `test_mainnet_sustainable_explorer` |
| testnet | `test_testnet_sustainable_explorer` |
| previewnet | `test_previewnet_sustainable_explorer` |

Resolved by `resolveDatabaseName(network)` in `src/shared/config/database.config.ts`.

### Worker: one process per network

Each worker process is scoped to exactly one network via `HEDERA_NET`:

```bash
HEDERA_NET=mainnet yarn start:worker   # writes to mainnet DB
HEDERA_NET=testnet yarn start:worker   # writes to testnet DB
```

Workers are completely isolated:
- Different databases (no row-level contention)
- Different seed root topics (`0.0.1368856` for mainnet, `0.0.1960` for testnet)
- Different Mirror Node URLs
- Independent BullMQ leader election per network's Redict namespace

### API: one process, multiple DataSources

The API is configured with `HEDERA_NETWORKS` (comma-separated):

```bash
HEDERA_NETWORKS=mainnet,testnet yarn start:api
```

At startup:

1. `ensureAllNetworkDatabasesExist()` creates any missing databases and extensions
2. `NetworkDataSourceRegistry.onModuleInit()` initializes **one TypeORM `DataSource` per network**:
   ```typescript
   for (const network of networks) {
       const config = getDatabaseConfig(network, { synchronize: false });
       const ds = new DataSource(config);
       await ds.initialize();
       this.dataSources.set(network, ds);
   }
   ```
3. The first entry in `HEDERA_NETWORKS` is treated as the default network.

### Path-based network routing

Instead of a `?network=` query parameter, the network is part of the URL path:

```
GET  /api/v1/mainnet/registries
GET  /api/v1/testnet/registries
GET  /api/v1/mainnet/registries/did:hedera:mainnet:...
```

The controller extracts the network via `@Param('network')`, passes it to the service, which resolves the correct `DataSource`:

```typescript
@Controller('api/v1/:network/registries')
export class RegistriesController {
    @Get()
    findAll(@Param('network') network: string, @Query() query: RegistryQueryDto) {
        return this.registriesService.findAll(network, query);
    }
}

// Service
async findAll(network: string, query: RegistryQueryDto) {
    const ds = this.dataSources.getDataSource(network);  // throws 404 if not configured
    const repo = new PgRegistryRepository(ds);
    return repo.findAll(query);
}
```

Unknown networks return HTTP 404 with the list of available networks.

### Why this approach

| Concern | Per-network databases | Shared DB + partitioning |
|---------|----------------------|--------------------------|
| **Physical isolation** | Yes | Partial |
| **Per-network backups** | Trivial (`pg_dump mainnet_*`) | Complex |
| **Scale to separate hosts** | Trivial (change connection string) | Not possible without reshuffling |
| **Query latency** | Optimal (small per-network tables) | Optimal (partition pruning) |
| **TypeORM `synchronize` compatibility** | Works | Breaks |
| **Schema migration complexity** | Standard | Custom per-partition handling |
| **Application code complexity** | Resolve DataSource by network | Add `WHERE network = ?` everywhere |

Per-network databases won because they provide perfect isolation with minimal added complexity (just one DataSource registry) and set the stage for future horizontal scaling across database hosts.

## API Layer

### Request flow

```
 HTTP Request
 GET /api/v1/mainnet/registries?search=DOVU&page=1
        │
        ▼
 ┌──────────────────────────────────────────┐
 │ RegistriesController                     │
 │   @Param('network') → 'mainnet'          │
 │   @Query() → { search, page, ... }       │
 └────────┬─────────────────────────────────┘
          │
          ▼
 ┌──────────────────────────────────────────┐
 │ RegistriesService                        │
 │   dataSources.getDataSource('mainnet')   │
 │   → returns mainnet's TypeORM DataSource │
 │   new PgRegistryRepository(dataSource)   │
 └────────┬─────────────────────────────────┘
          │
          ▼
 ┌──────────────────────────────────────────┐
 │ RegistryRepository (abstract)            │
 │   findAll(query): RegistryListResult     │
 │   findByDid(did): RegistryRow | null     │
 └────────┬─────────────────────────────────┘
          │ implemented by
          ▼
 ┌──────────────────────────────────────────┐
 │ PgRegistryRepository                     │
 │   - Raw SQL with jsonb operators         │
 │   - tsvector @@ plainto_tsquery          │
 │   - similarity() trigram fuzzy match     │
 │   - LEFT JOIN mv_registry_stats          │
 │   - ts_rank + similarity for ordering    │
 └────────┬─────────────────────────────────┘
          │
          ▼
 ┌──────────────────────────────────────────┐
 │ PostgreSQL (mainnet database)            │
 │   business_view + mv_registry_stats      │
 └──────────────────────────────────────────┘
```

### Repository abstraction

All PostgreSQL-specific features live in a concrete repository implementation. Services depend only on the abstract class:

```
src/api/repositories/
├── registry.repository.ts      ← abstract class (interface)
└── pg-registry.repository.ts   ← PostgreSQL implementation
```

The abstract `RegistryRepository` defines the contract:

```typescript
export abstract class RegistryRepository {
    abstract findAll(query: RegistryListQuery): Promise<RegistryListResult>;
    abstract findByDid(did: string): Promise<RegistryRow | null>;
}
```

The `PgRegistryRepository` implementation encapsulates all PostgreSQL-specific SQL:

| PG feature | Used for |
|------------|----------|
| `jsonb` operators (`->`, `->>`) | Extracting `businessData->'options'->>'geography'` |
| `tsvector @@ plainto_tsquery` | Full-text search |
| `similarity()` from `pg_trgm` | Fuzzy / typo-tolerant search |
| `ts_rank()` | Relevance-based sorting |
| `LEFT JOIN materialized view` | Single-query stats aggregation |
| `ON CONFLICT ... DO UPDATE` | Idempotent upserts |
| Generated `tsvector` columns | Auto-updating search index |
| GIN indexes | O(log n) full-text + trigram search |

**Benefits of the abstraction:**
- Services are decoupled from the database implementation
- New storage backends (e.g., read-only Elasticsearch cache) can be added by implementing the interface
- Tests can mock the repository easily
- Query performance tuning happens in one place

### Full-text search with ranked results

The `business_view` table has a generated `searchVector` column with weighted content:

```sql
searchVector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("displayName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("registryDid", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("searchText", '')), 'C')
) STORED
```

Weight `A` > `B` > `C` means name matches rank higher than DID matches, which rank higher than free-text matches.

Search combines four strategies (OR'd together):

1. **Full-text match**: `searchVector @@ plainto_tsquery('english', $term)` (O(log n) via GIN)
2. **Contains match**: `ILIKE '%term%'` on name, DID, tags, geography (trigram index helps)
3. **Fuzzy match**: `similarity(displayName, $term) > 0.3` via `pg_trgm`
4. **DID exact or partial**: `registryDid ILIKE '%term%'`

Results are ranked by `ts_rank + similarity`, so the most relevant match appears first.

### Aggregation via materialized views

`mv_registry_stats` pre-computes per-registry counts from `business_view`:

```sql
CREATE MATERIALIZED VIEW mv_registry_stats AS
SELECT
    "registryDid",
    COUNT(*) FILTER (WHERE "viewType" = 'METHODOLOGY') AS policy_count,
    COUNT(*) FILTER (WHERE "viewType" = 'PROJECT') AS project_count,
    COUNT(*) FILTER (WHERE "viewType" = 'CREDIT') AS issuance_count,
    0::bigint AS user_count,
    MAX("lastUpdate") AS last_update
FROM business_view
WHERE "registryDid" IS NOT NULL
  AND "viewType" IN ('METHODOLOGY', 'PROJECT', 'CREDIT')
GROUP BY "registryDid";
```

A unique index on `registryDid` enables `REFRESH MATERIALIZED VIEW CONCURRENTLY` (non-blocking refresh).

The API joins the MV in the main query (single round trip, no N+1):

```sql
SELECT bv.*, s.policy_count, s.project_count, s.issuance_count, s.user_count
FROM business_view bv
LEFT JOIN mv_registry_stats s ON s."registryDid" = bv."registryDid"
WHERE bv."viewType" = 'REGISTRY'
ORDER BY ts_rank(...) DESC NULLS LAST;
```

The MV is refreshed every 60 seconds by `MvRefreshProcessor` on the worker.

### Schema bootstrap

TypeORM's `synchronize: true` can't express generated `tsvector` columns, GIN indexes, or extensions. These are applied by `bootstrapSchema()` in `src/shared/database/schema-bootstrap.ts` after TypeORM finishes syncing entities:

1. Creates `pg_trgm` extension
2. Adds `business_view.searchVector` as `GENERATED ALWAYS AS (...) STORED`
3. Creates GIN index on `searchVector`
4. Creates trigram GIN indexes on `displayName` and `searchText`

The worker runs this bootstrap on startup (after TypeORM synchronize). The API does **not** run synchronize (`synchronize: false`) — it trusts the schema that the worker has created.

## Frontend Integration

### SSR-aware data fetching

The Registry list uses Nuxt's `useAsyncData` wrapped in a custom composable (`useRegistriesApi`). This gives the page full SSR support:

```typescript
const { data, pending, error, refresh } = useAsyncData(
    key,  // stable, derived from query params
    async () => $fetch(`/api/v1/${network}/registries`, { baseURL, query }),
    { default: () => emptyResponse(), watch: [...reactive refs] }
);
```

**SSR flow:**

1. Browser requests `GET /registries`
2. Nuxt runs the page setup on the Node server
3. `useAsyncData` fires `$fetch` — server calls `http://localhost:3030/api/v1/mainnet/registries` directly (no dev proxy loop)
4. Awaits the response before rendering the template
5. Renders complete HTML with data embedded
6. Serializes the payload into `window.__NUXT__` inside the HTML
7. Browser receives fully-populated HTML + payload
8. Vue hydrates using the server payload — no client refetch
9. Subsequent user interactions (sort, paginate, search) reactively trigger re-fetches via the `watch` array

### Base URL switching

```typescript
const baseURL = import.meta.server
    ? config.apiBaseUrl           // 'http://localhost:3030'
    : config.public.apiBaseUrl;   // '' (relative path + dev proxy)
```

- **Server side:** calls the API directly by its full URL (avoids calling Nuxt itself)
- **Client side:** uses relative path, routed through Nuxt's dev proxy in `nuxt.config.ts`

### Network selection flow

```
┌──────────────────────────────────────────┐
│ Topbar network selector                  │
│   useNetwork() → ref('mainnet' | ...)    │
└────────┬─────────────────────────────────┘
         │ user clicks Testnet
         ▼
┌──────────────────────────────────────────┐
│ network.value = 'testnet'                │
└────────┬─────────────────────────────────┘
         │ watched by useRegistriesApi
         ▼
┌──────────────────────────────────────────┐
│ useAsyncData re-fetches:                 │
│   url = /api/v1/testnet/registries       │
│   new key → triggers SSR payload check   │
└──────────────────────────────────────────┘
```

The path contains the network, so it changes every time the user switches networks, and `useAsyncData` treats each network as a separate cached query.

## Database Entities

Each network has its own database containing the same set of tables. There is no `network` column anywhere — the database name is the network scope.

### Core pipeline entities

| Entity | Table | Purpose |
|--------|-------|---------|
| `Message` | `message` | Parsed HCS messages (main data table) |
| `MessageCache` | `message_cache` | Interim storage during processing |
| `TopicCache` | `topic_cache` | Topic sync watermarks |
| `TokenCache` | `token_cache` | Token metadata + NFT watermarks |
| `NftCache` | `nft_cache` | Individual NFT serial tracking |
| `IpfsFile` | `ipfs_files` | IPFS document content storage (per-network, not deduped across networks) |
| `BusinessView` | `business_view` | Materialized business entities + generated `searchVector` tsvector |
| `SynchronizationTask` | `synchronization_task` | Data source sync timestamps |
| `Log` | `log` | Error and event logging |

### Materialized views

| Name | Purpose | Refresh cadence |
|------|---------|-----------------|
| `mv_registry_stats` | Per-registry counts of policies, projects, issuances | Every 60s (MvRefreshProcessor) |

### Indexes of note

| Index | Purpose |
|-------|---------|
| `idx_business_view_search_vector` (GIN) | O(log n) full-text search |
| `idx_business_view_display_name_trgm` (GIN, gin_trgm_ops) | Trigram fuzzy matches on name |
| `idx_business_view_search_text_trgm` (GIN, gin_trgm_ops) | Trigram fuzzy matches on free text |
| `idx_mv_registry_stats_registry_did` (UNIQUE) | Enables `REFRESH CONCURRENTLY` |

## Running Multiple Networks Locally

```bash
# Terminal 1 — mainnet worker
HEDERA_NET=mainnet yarn dev:worker

# Terminal 2 — testnet worker
HEDERA_NET=testnet yarn dev:worker

# Terminal 3 — API (serves both)
HEDERA_NETWORKS=mainnet,testnet yarn dev:api

# Terminal 4 — frontend
cd frontend && yarn dev
```

Then:

- http://localhost:3030/api/docs — Swagger UI (pick network from path dropdown)
- http://localhost:3030/api/v1/mainnet/registries
- http://localhost:3030/api/v1/testnet/registries
- http://localhost:3000/registries — frontend with topbar network switcher
