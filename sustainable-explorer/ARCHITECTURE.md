# Sustainable Explorer — Data Pipeline Architecture

This document describes how the Sustainable Explorer worker ingests data from the Hedera Mirror Node and IPFS, maps it to business entities, and supports horizontal scaling.

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
    image: sustainable-explorer-worker
    environment:
      WORKER_QUEUES: mirror-node-topics,mirror-node-messages
    deploy:
      replicas: 3

  worker-ipfs:
    image: sustainable-explorer-worker
    environment:
      WORKER_QUEUES: ipfs-files
      WORKER_IPFS_CONCURRENCY: 10
    deploy:
      replicas: 5

  worker-tokens:
    image: sustainable-explorer-worker
    environment:
      WORKER_QUEUES: mirror-node-tokens
    deploy:
      replicas: 1

  worker-maintenance:
    image: sustainable-explorer-worker
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
| `Standard Registry` | `ORGANIZATION` | Registry organization (Verra, Gold Standard, etc.) |
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

## Database Entities

### Core pipeline entities

| Entity | Table | Purpose |
|--------|-------|---------|
| `Message` | `message` | Parsed HCS messages (main data table) |
| `MessageCache` | `message_cache` | Interim storage during processing |
| `TopicCache` | `topic_cache` | Topic sync watermarks |
| `TokenCache` | `token_cache` | Token metadata + NFT watermarks |
| `NftCache` | `nft_cache` | Individual NFT serial tracking |
| `IpfsFile` | `ipfs_files` | IPFS document content storage |
| `BusinessView` | `business_view` | Materialized business entities |
| `SynchronizationTask` | `synchronization_task` | Data source sync timestamps |
| `Log` | `log` | Error and event logging |
