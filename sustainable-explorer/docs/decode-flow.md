# Decode Flow: From Root Topic to Project Rows

End-to-end documentation of how the Sustainable Explorer worker discovers Hedera Guardian methodologies, decodes their policy ZIPs, classifies project schemas, and produces the `PROJECT` rows that the frontend renders.

This document is the source-of-truth for the ingestion pipeline. If you change a step, update this file.

---

## High-level pipeline

```
[Hedera Mirror Node]
        │
        ▼
┌──────────────────┐    enqueues    ┌──────────────────────────┐
│ TopicSync        │ ─────────────▶ │ MessageProcess           │
│ (per topic)      │                │ (per HCS message)        │
└──────────────────┘                └─────┬───────┬───────┬────┘
        ▲                                 │       │       │
        │ recurses on                     ▼       ▼       ▼
        │ child topics              ┌────────┐ ┌──────┐ ┌──────┐
        │ discovered in             │ Topic  │ │Policy│ │ IPFS │
        │ each message              │ Sync   │ │Decode│ │Fetch │
        │                           │(child) │ │      │ │ (VC) │
        │                           └────────┘ └──┬───┘ └──┬───┘
        │                                         │        │
        │                                         ▼        ▼
        │                                ┌────────────────────────────┐
        │                                │ Schemas, decode status,    │
        │                                │ field map → policy_*       │
        │                                └────────────┬───────────────┘
        │                                             │
        │                                             ▼
        │                          ┌──────────────────────────────────┐
        │                          │ ProjectMapperService             │
        │                          │ (eager: per VC IPFS arrival)     │
        │                          └────────────┬─────────────────────┘
        │                                       │
        │                                       ▼
        │                                  business_view PROJECT rows
        │
        └──────── BusinessViewBuilderProcessor (60-min cron, only for
                  METHODOLOGY / REGISTRY / CREDIT rows) ──────────────▶ business_view
```

The dataflow is one-way: HCS messages enter → state lands in Postgres → frontend reads from Postgres + materialized views.

---

## Database tables

| Table                     | Purpose                                                                                                        | Owner                          |
|---------------------------|----------------------------------------------------------------------------------------------------------------|--------------------------------|
| `topic_cache`             | Per-topic sync watermark (last sequence number, hasNext flag).                                                 | TopicSyncProcessor             |
| `message_cache`           | Raw base64 HCS messages from Mirror Node, awaiting parsing.                                                    | TopicSyncProcessor             |
| `message`                 | Parsed HCS messages (one row per HCS message). `documents` is filled later by IpfsFetchProcessor for VCs.      | MessageProcessProcessor        |
| `policy_schema`           | One row per JSON schema imported from a policy ZIP. Marked `isProjectSchema=TRUE` for the confirmed project anchor. | PolicySchemaImportService + PolicyDecodeProcessor |
| `policy_decode_status`    | One row per policy topic. Decode lifecycle (pending/success/failed) plus all decode-derived data: categories, sectoral scopes, schema label map, field map, project field map, geo key. | PolicyDecodeProcessor          |
| `ipfs_files`              | CID → fetched bytes cache.                                                                                     | IpfsFetchProcessor             |
| `business_view`           | Frontend view-model. Rows for METHODOLOGY / REGISTRY / CREDIT / PROJECT.                                       | BusinessViewBuilderProcessor (METH/REG/CRED) + ProjectMapperService (PROJECT) |
| `mv_registry_stats`       | Materialized view: per-registry counts (policies, projects, credits, decode status counts).                    | MvRefreshProcessor             |
| `mv_methodology_stats`    | Materialized view: per-methodology counts (projects, credits, schemas).                                        | MvRefreshProcessor             |

Schema migrations live in `src/shared/database/schema-bootstrap.ts` (raw SQL, idempotent, run **before** Nest starts so `onModuleInit` hooks see the tables).

---

## BullMQ queues

All queues are namespaced by Hedera network (`-mainnet` / `-testnet` / `-previewnet`).

| Queue                              | Processor                          | What it does                                                |
|------------------------------------|------------------------------------|-------------------------------------------------------------|
| `topic-sync-{net}`                 | `TopicSyncProcessor`               | Pull messages from Mirror Node REST for one topic.          |
| `mirror-node-messages-{net}`       | `MessageProcessProcessor`          | Decode + parse one cached message; fan out follow-ups.      |
| `ipfs-files-{net}`                 | `IpfsFetchProcessor`               | Fetch one IPFS CID and (for VCs) call `ProjectMapperService`. |
| `policy-decode-{net}`              | `PolicyDecodeProcessor`            | Download a policy ZIP, import schemas, run mapping pipeline, classify. |
| `mirror-node-tokens-{net}`         | `TokenSyncProcessor`               | Sync token metadata + NFT serials from Mirror Node.         |
| `maintenance-build-business-views-{net}` | `BusinessViewBuilderProcessor` | Build METHODOLOGY/REGISTRY/CREDIT rows in business_view.    |
| `maintenance-refresh-mvs-{net}`    | `MvRefreshProcessor`               | `REFRESH MATERIALIZED VIEW CONCURRENTLY` for both MVs.      |

Repeating jobs (60-min business-view build, 60-s MV refresh) are scheduled by `SyncSchedulerService` on the leader-elected worker only.

---

## Step-by-step flow

### 0. Boot — `src/worker/main.ts`

1. **`ensureDatabaseExists()`** — connects to `postgres` db, creates per-network DB if missing.
2. **`bootstrapSchema()`** — runs raw `ALTER/CREATE` SQL in a one-shot DataSource. Creates `policy_decode_status`, `business_view.projectKey`, indexes, generated tsvector columns, etc. Runs **before** `NestFactory.createApplicationContext` so onModuleInit queries don't see missing tables.
3. **`NestFactory.createApplicationContext(WorkerModule.register())`** — Nest spins up the `WorkerModule` which:
   - registers TypeORM with all entities,
   - registers BullMQ with the active queue list (filtered by `WORKER_QUEUES` env var),
   - registers only the processors for queues this instance handles,
   - registers `SyncSchedulerService` on instances that handle `mirror-node-*` queues.

### 1. Root topic seeding — `SyncSchedulerService.seedRootTopic()`

`src/worker/schedulers/sync-scheduler.service.ts:120`

Network → root topic mapping is hardcoded (Guardian's published Standard-Registry announcement topics):

| Network    | Root Topic ID |
|------------|---------------|
| Mainnet    | `0.0.1368856` |
| Testnet    | `0.0.1960`    |
| Previewnet | `0.0.10071`   |

Idempotent upsert into `topic_cache` (`hasNext = true`, `lastUpdate = now`). Always runs on every worker boot — if someone deletes the row, next restart re-seeds it.

### 2. Topic sync loop — `TopicSyncProcessor`

`src/worker/processors/topic-sync.processor.ts`

For each `(topicId, fromSequenceNumber)` job:

1. `HederaService.getTopicMessages(topicId, fromSeq, limit=100)` — REST call to `/api/v1/topics/{id}/messages`.
2. Insert each message (base64) into `message_cache` with status `NEW`.
3. Enqueue `MessageProcessProcessor` for each `consensusTimestamp`.
4. Update `topic_cache.messages` (watermark) + `hasNext`.
5. If a full page (100) was returned, **self-enqueue** the next page with a small delay; otherwise stop polling this topic for now (`hasNext=false`).
6. Org/registry topics poll 3× faster than data topics (`orgPollDelay = pollDelay/3`).

`SyncSchedulerService.scheduleTopicSyncs()` (line 165) seeds initial jobs for every topic in `topic_cache` on boot, using its watermark.

### 3. Per-message processing — `MessageProcessProcessor`

`src/worker/processors/message-process.processor.ts`

Reads one row from `message_cache`, decodes Base64, parses JSON via `decodeBase64Message` + `parseMessageJson`. UPSERTs into `message` (line 77).

Then it fans out **side effects** based on the message type:

#### 3a. Detect a published Instance-Policy

```ts
const isPublishedPolicy =
    parsed.type === 'Instance-Policy' &&
    (parsed.action || '').toLowerCase() === 'publish-policy';

if (isPublishedPolicy) {
    for (const cid of parsed.files) {
        await this.policyDecodeQueue.add('decode', { cid, messageTimestamp, policyTopicId }, { jobId: `policy-decode-${policyTopicId}-${cid}` });
    }
}
```

Only published policies are queued for decode — drafts and other actions pass through without becoming methodologies.

#### 3b. IPFS fetch fan-out (gated for VCs)

```ts
if (parsed.type === 'VC-Document') {
    await this.enqueueVcIpfsFetchIfReady(parsed, ts, topicId);
} else if (EAGER_IPFS_TYPES.has(parsed.type)) {
    for (const cid of parsed.files) {
        await this.ipfsQueue.add('fetch', { cid, messageTimestamp: ts }, { jobId: `ipfs-${cid}` });
    }
}
```

`EAGER_IPFS_TYPES` = `{ Standard Registry, Policy, Instance-Policy, Module, Tool, Token, Schema }`.

For **VC-Document** messages, `enqueueVcIpfsFetchIfReady`:
1. Walks the topic parent chain (up to 12 hops) via DB lookups to find the Instance-Policy topic this VC belongs to.
2. Reads `policy_decode_status.status` for that policy.
3. Only enqueues IPFS fetch if `status='success'`. Otherwise the VC row sits with `documents IS NULL` until the policy decodes — then `PolicyDecodeProcessor.backfillDeferredVcFetches` enqueues it.

> **Why gate VCs?** IPFS fetches are slow and the gateway has limited concurrency. Fetching VCs for a methodology that hasn't decoded yet wastes capacity — we'd have nothing to do with the documents. Once the policy decodes, the backfill enqueues all the deferred VCs in one pass.

#### 3c. Discover child topics + tokens

```ts
const discoveredTopics = extractDiscoverableTopics(parsed, topicId);
for (const topic of discoveredTopics) {
    await this.topicQueue.add('sync', { topicId: topic.topicId, fromSequenceNumber: 0, isOrgTopic: topic.isOrgTopic }, ...);
}

const tokenIds = extractTokenIds(parsed);
for (const tokenId of tokenIds) await this.tokenQueue.add('sync', ..., ...);
```

This is what makes the crawl recursive: each new message can announce new topics. `isOrgTopic` (Standard-Registry topics) get higher priority + faster polling.

### 4. Policy decode — `PolicyDecodeProcessor`

`src/worker/processors/policy-decode.processor.ts`

The most important step. This is where a policy ZIP becomes structured, queryable data.

```ts
async process(job) {
    await upsertDecodeStatus('pending');     // clears all derived columns
    try {
        await runDecode(...);
    } catch (err) {
        await upsertDecodeStatus('failed', err.message);
        throw err;                            // BullMQ will retry per its backoff
    }
}
```

`runDecode` (line 55) flow:

1. **Idempotent short-circuit** — if `policy_schema` already has rows for this `(policyTopicId, sourceCid)`, don't re-import. Mark `success` and return.
2. **Fetch ZIP** — `IpfsService.fetchContent(cid)` tries each gateway in `IPFS_GATEWAYS` in order until one succeeds. Throws `"All IPFS gateways failed for CID …"` on total failure.
3. **Load ZIP** — `JSZip.loadAsync(zipBuffer)`.
4. **Parse categories** — `extractCategoriesFromZip(zip)` reads `policy.json` `categoriesExport` and derives:
   - `sectoralScopes: string[]` (e.g. `["Energy industries (renewable / non-renewable sources)"]`)
   - `emissionReductionApproach: 'Avoidance' | 'Removal' | 'Avoidance & Removal' | null`
5. **Import schemas** — `PolicySchemaImportService.importSchemasFromZip(zip, …)` extracts every `*.schema.json` from the ZIP and writes a `policy_schema` row per schema.
6. **Run the mapping pipeline** — `MappingPipelineService.executePipeline(schemas, fieldDescriptorsFromProjectFields())`. See §5.
7. **Derive per-policy project meta** — `derivePerPolicyProjectMeta(fieldMap, schemas)` picks the schema that owns the most matched fields → that's `projectSchemaId`. Builds `projectFieldMap` (only paths that point into the anchor schema), `projectGeoKey`, `projectGeoSection`. Marks `policy_schema.isProjectSchema = TRUE` for the anchor, FALSE for siblings.
8. **Single atomic upsert** — write `categoriesExport`, `sectoralScopes`, `emissionReductionApproach`, `schemaLabelMap`, `fieldMap`, `projectFieldMap`, `projectGeoKey`, `projectGeoSection`, `projectSchemaId` to `policy_decode_status` with status `'success'`.
9. **Backfill deferred VCs** — `backfillDeferredVcFetches(policyTopicId)` runs a recursive CTE to find every `VC-Document` in this policy's topic subtree where `documents IS NULL`, and enqueues `ipfs-fetch` jobs for them.

#### Recursive CTE for the topic subtree

```sql
WITH RECURSIVE descendants AS (
    SELECT $policyTopicId::text AS "topicId"
    UNION ALL
    SELECT t."topicId"
    FROM message t
    JOIN descendants d ON (t.options->>'parentId') = d."topicId"
    WHERE t.type = 'Topic'
)
SELECT m."consensusTimestamp", unnest(m.files) AS cid
FROM message m
JOIN descendants d ON d."topicId" = m."topicId"
WHERE m.type = 'VC-Document' AND m.documents IS NULL AND m.files IS NOT NULL
```

The same query is also used by `SyncSchedulerService.backfillSuccessfulPolicyVcFetches()` at boot, in case the worker died mid-flight.

### 5. The mapping pipeline — `MappingPipelineService`

`src/worker/mapping/mapping-pipeline.service.ts`

DI-driven two-step pipeline:
1. **Map Schemas** (label each schema as `ProjectSchema`/`PDD`/`MonitoringReport`/etc). Strategy chosen by `MAP_SCHEMAS_METHOD` env var. Default: `GeoJsonMapSchemasService`.
2. **Map Fields** (cross-schema fuzzy match: each `PROJECT_EXTRACT_FIELDS` entry → best `schemaId.path`). Strategy chosen by `MAP_FIELDS_METHOD` env var.

#### Default field-mapping strategy: `CrossSchemaFuzzyMapperService`

`src/worker/mapping/strategies/map-fields/cross-schema-fuzzy-mapper.service.ts`

The replacement for the old GeoJSON-only classifier. Algorithm:

1. Walk every field of every schema in the policy (top-level + one nested level). Each candidate carries `{ schemaId, path, key, title, description, comment, type, isGeoJson }`.
2. For each entry in `PROJECT_EXTRACT_FIELDS`, score every candidate:
   - **60% token-overlap** between candidate haystack (`title + description + key + $comment`) and the entry's `keywords`.
   - **40% Jaro-Winkler similarity** between `entry.label` and `candidate.title`.
   - **× 0.2 penalty** if any `exclude` word appears in the haystack.
   - **× 2.0 boost** when `entry.key === 'geo'` AND `candidate.isGeoJson === true` (clamped to 1.0).
   - Threshold `0.3` — below that returns `null`.
3. Optional **LLM fallback** for unmatched fields (only when `GEMINI_API_KEY` or `OPENAI_API_KEY` is set; silently skipped otherwise). Builds a single prompt listing all candidates from all schemas + the unmatched required fields, asks the LLM to pick the best `schemaId.path` for each.
4. Returns a `FieldMap` of shape `{ [fieldKey]: 'schemaId.path' }`.

The output drives `derivePerPolicyProjectMeta` in `PolicyDecodeProcessor`.

#### `PROJECT_EXTRACT_FIELDS` — the canonical list

`src/worker/project-mapper/project-fields.ts`

| Key                | Label                       | Keywords                                                                 | Exclude                                                       |
|--------------------|-----------------------------|--------------------------------------------------------------------------|---------------------------------------------------------------|
| `name`             | Project Title               | project name, project title, name, title                                 | methodology, reference, pdd, section, table, site, document   |
| `country`          | Country                     | country                                                                  | participant, applicant                                        |
| `developer`        | Developer                   | developer, proponent, organization, project developer, applicant         | —                                                             |
| `category`         | Category                    | category, project type                                                   | —                                                             |
| `scale`            | Scale                       | scale, project scale                                                     | —                                                             |
| `sector`           | Sector                      | sector, activity                                                         | —                                                             |
| `vintageRaw`       | Vintage / Start Date        | start date, commencement, vintage                                        | —                                                             |
| `creditingPeriod`  | Crediting Period            | crediting period                                                         | —                                                             |
| `sdgOrCobenefits`  | SDGs / Co-benefits          | co-benefit, sustainable, sdg                                             | —                                                             |
| `geo`              | Project Location            | geo, location, coordinates, boundary, site location, project location, geometry, geojson, shape, polygon | — |

Adding a new project attribute is a **single-line change**: add an entry here. The fuzzy matcher picks it up at decode time, the per-VC extractor reads it, and the `/decoded` API surfaces it.

### 6. IPFS fetch + eager project mapping — `IpfsFetchProcessor`

`src/worker/processors/ipfs-fetch.processor.ts`

```ts
async process(job) {
    if (existsInIpfsFiles(cid)) return;                 // idempotent
    const content = await ipfsService.fetchContent(cid);
    INSERT INTO ipfs_files (cid, content, size, ...) ON CONFLICT DO NOTHING;
    const parsed = JSON.parse(content);
    UPDATE message SET documents = $parsed WHERE files @> ARRAY[$cid];
    if (parsed.credentialSubject) {
        await projectMapperService.upsertProjectFromVc(messageTimestamp);   // try/catch — non-fatal
    }
    redis.publish('se:events', { type: 'document-loaded', ... });
}
```

The redis publish is what keeps the frontend-on-the-network views fresh.

#### `IpfsService` — gateway fan-out

`src/worker/services/ipfs.service.ts`

Reads `IPFS_GATEWAYS` (comma-separated). Tries each in order, converts the CID to v1 base32 for compatibility, returns the first successful body. Throws `All IPFS gateways failed for CID …: <per-gateway errors>` if all fail.

> **Common pitfall**: a single local IPFS gateway (`http://localhost:8080/ipfs/`) often doesn't have arbitrary mainnet CIDs pinned. Add public fallbacks (`https://w3s.link/ipfs/`, `https://nftstorage.link/ipfs/`, `https://ipfs.io/ipfs/`) for resilience.

### 7. VC → Project — `ProjectMapperService.upsertProjectFromVc`

`src/worker/services/project-mapper.service.ts`

Called once per VC document. Single source of truth for `business_view` PROJECT rows since the periodic `buildProjectViewsPolicyBased` was removed.

Flow:

1. Load the message row by `consensusTimestamp` (must be `type='VC-Document'` and have `documents`).
2. Extract `credentialSubject[0]`. Take its `type` field, split on `&`, strip leading `#` → that's the schema UUID for this VC.
3. **Resolve schema entry** in this priority:
   1. Fast path: `policy_decode_status.projectFieldMap` + `projectGeoKey` + `projectGeoSection` for the policy of this VC, joined with `policy_schema` for `title`/`description`. Use this when the VC's schema is the project anchor.
   2. Slow path: `buildSchemaEntryImproved` from `schema-classifier.ts` against the schema's raw `document`, used for sibling/wrapper schemas (Shape C — wrapper property `$ref`s the anchor schema).
4. Compute the `subject` object (either `cs` or `cs[section]` if the schema wraps fields one level deep).
5. **Geo extraction** — try standard GeoJSON via `extractLatLng`, fall back to nested lat/lng strings via `extractLatLngStrings`. If neither works, `lat=null, lng=null` — the project still gets a row, just without map coordinates.
6. **Field extraction** — loop `PROJECT_EXTRACT_FIELDS`. For each entry:
   - Fast path: pre-resolved key from `projectFieldMap` → direct lookup.
   - Fallback: `findFieldByTitleOrDesc` / `findFieldByTitleOrDescExcluding` (keyword scan against title+description).
   - `unwrapValue` flattens nested-dict / list-of-dict values to a string.
7. Special handling for `creditingPeriod` (`{from, to}` object), `sdgOrCobenefits` (parses comma-separated SDG numbers OR free-text via `extractSdgsFromText`), and `emission_reduction.ER_y` (the credit amount on the VC).
8. **Resolve methodology** — `resolveMethod(vc.topicId, developer, maps)` walks the topic parent chain to find the policy this VC belongs to (handles cases where VCs are submitted under user/instance topics that descend from the policy topic).
9. **Compute dedup key**:
   - With coordinates: `${name}|${round(lat,4)}|${round(lng,4)}`
   - Without coordinates: `${name}|${country ?? '_'}` (avoids merging same-name projects in different countries)
10. **Upsert into `business_view`**:

    ```sql
    INSERT INTO business_view ("sourceTimestamp", "viewType", "displayName", "registryDid",
                               "relatedTopicId", "businessData", "searchText", "projectKey", ...)
    VALUES (..., 'PROJECT', ..., $projectKey)
    ON CONFLICT ("projectKey") WHERE "viewType"='PROJECT' AND "projectKey" IS NOT NULL
    DO UPDATE SET
        "businessData" = jsonb_set(... credits=old+new, vcCount=old+1 ...),
        "lastUpdate" = ...
    ```

    The `(viewType='PROJECT', projectKey)` partial unique index is what makes upsert merge multiple VCs (issuance + monitoring report + retirement) into a single PROJECT row with cumulative `credits` + `vcCount`.

### 8. Methodology / Registry / Credit rows — `BusinessViewBuilderProcessor`

`src/worker/processors/business-view-builder.processor.ts`

A single `INSERT … SELECT … ON CONFLICT DO UPDATE` over the `message` table that produces three view types:

| `m.type`            | Filter                          | `viewType`     |
|---------------------|---------------------------------|----------------|
| `Instance-Policy`   | `m.action = 'publish-policy'`   | `METHODOLOGY`  |
| `Standard Registry` | (any)                           | `REGISTRY`     |
| `Token`             | (any)                           | `CREDIT`       |

Runs every 60 minutes plus an immediate one-shot at boot. Idempotent — re-runs upsert on the natural key `(sourceTimestamp, viewType)`.

> **Does NOT touch PROJECT rows.** Those are produced eagerly in step 7. The processor is purely a frontend view-model materializer.

### 9. Materialized views — `MvRefreshProcessor`

`src/worker/processors/mv-refresh.processor.ts`

Runs every 60s (configurable via `MV_REFRESH_INTERVAL`). Issues `REFRESH MATERIALIZED VIEW CONCURRENTLY` for:

- **`mv_registry_stats`** — per-registry counts: policies, projects, credits, decode-status counts (success/failed/pending/unknown counts of methodologies). Joined from `business_view` + `policy_decode_status`.
- **`mv_methodology_stats`** — per-methodology counts: projects, credits, schemas, last update, decode_status, attempts, lastAttemptAt.

Both have unique indexes (required by `CONCURRENTLY`). Pure aggregation — no business logic.

### 10. Frontend reads from Postgres + MVs

The API (`src/api/`) reads only from `business_view` + the materialized views + `policy_schema` + `policy_decode_status`. Notable endpoints:

| Endpoint                                          | Source                                                                 |
|---------------------------------------------------|-----------------------------------------------------------------------|
| `/methodologies`                                  | `business_view` METHODOLOGY rows joined with `mv_methodology_stats` + `policy_decode_status` (for `decodeStatus` + `sectoralScopes` + `emissionReductionApproach`) |
| `/methodologies/:id/decoded`                      | `policy_decode_status` (for status + projectSchemaConfig) + `policy_schema` (for `availableSchemas` + project schema name/description) |
| `/methodologies/:id/schemas`                      | `policy_schema` rows for the topic                                    |
| `/registries`                                     | `business_view` REGISTRY rows + `mv_registry_stats`                   |
| `/projects`                                       | `business_view` PROJECT rows                                          |

The Decoded Mapping tab on the frontend reads `/methodologies/:id/decoded` → renders the per-field schema mapping table + (if `projectSchema` is null) the list of imported `availableSchemas` so users can see what was decoded even when classification didn't pick an anchor.

---

## Class / file inventory

### Worker (`src/worker/`)

| File                                                                     | Role                                                                                     |
|--------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| `main.ts`                                                                | Bootstrap + schema bootstrap + Nest context creation.                                    |
| `worker.module.ts`                                                       | DI registration: TypeORM, BullMQ, processors, services, scheduler.                       |
| `schedulers/sync-scheduler.service.ts`                                   | Leader-elected (Redis lock) scheduler. Seeds root topic, schedules topic/token/MV/business-view jobs, runs boot-time backfills. |
| `processors/topic-sync.processor.ts`                                     | Mirror Node REST polling per topic (paginated, self-enqueuing).                          |
| `processors/message-process.processor.ts`                                | Decode + parse one HCS message; fan out IPFS / decode / topic / token jobs.              |
| `processors/ipfs-fetch.processor.ts`                                     | Fetch one IPFS CID; for VCs, call `ProjectMapperService`.                                |
| `processors/policy-decode.processor.ts`                                  | Download ZIP, import schemas, run mapping pipeline, derive project meta, write `policy_decode_status`. |
| `processors/token-sync.processor.ts`                                     | Token + NFT serial sync from Mirror Node.                                                |
| `processors/business-view-builder.processor.ts`                          | Periodic METHODOLOGY/REGISTRY/CREDIT upsert.                                             |
| `processors/mv-refresh.processor.ts`                                     | Periodic `REFRESH MATERIALIZED VIEW CONCURRENTLY`.                                       |
| `services/hedera.service.ts`                                             | Mirror Node REST client.                                                                 |
| `services/ipfs.service.ts`                                               | Multi-gateway IPFS fetch with fallback.                                                  |
| `services/policy-schema-import.service.ts`                               | Parse policy ZIP → upsert `policy_schema` rows.                                          |
| `services/project-mapper.service.ts`                                     | **Eager per-VC project upsert.** Called from `IpfsFetchProcessor`.                       |
| `mapping/mapping-pipeline.service.ts`                                    | Two-step pipeline orchestrator (DI-driven).                                              |
| `mapping/strategies/map-schemas/geo-json-map-schemas.service.ts`         | Default schema labeller.                                                                 |
| `mapping/strategies/map-fields/cross-schema-fuzzy-mapper.service.ts`     | Default field mapper. Token overlap + Jaro-Winkler + optional LLM fallback.              |
| `mapping/strategies/map-fields/llm-field-mapper.service.ts`              | Standalone LLM field mapper (single-schema). Available via `MAP_FIELDS_METHOD=LLM-FIELD-MAPPER`. |
| `mapping/strategies/map-fields/heuristic-field-mapper.service.ts`        | Dummy (returns `{}`). Kept for the strategy enum.                                        |
| `project-mapper/project-fields.ts`                                       | Canonical `PROJECT_EXTRACT_FIELDS` list.                                                 |
| `project-mapper/schema-classifier.ts`                                    | `buildSchemaEntryImproved` — used by the project mapper for sibling-schema Shape C lookups. |
| `project-mapper/helpers.ts`                                              | Shared utilities: `slugify`, `normalizeSector`, `resolveMethod`, `parseSchemaDoc`, `findGeoJsonDefKey`, `isGeoJsonProperty`, `extractLatLng`, `loadResolutionMaps`, `resolveFieldPaths`. |
| `project-mapper/improved-heuristic.mapper.ts`                            | Now a thin module of helpers used by `ProjectMapperService` (`extractSdgsFromText`, `extractLatLngStrings`, `findFieldByTitleOrDesc`, `findFieldByTitleOrDescExcluding`). The historical batch mapper has been deleted. |
| `project-mapper/types.ts`                                                | Shared types: `FieldDef`, `SchemaEntry`, `ProjectRecord`, `ResolutionMaps`, `ResolvedFieldPaths`, `MethodEntry`. |

### API (`src/api/`)

| File                                                       | Role                                                                                |
|------------------------------------------------------------|-------------------------------------------------------------------------------------|
| `controllers/methodologies.controller.ts`                  | `GET /methodologies`, `GET /methodologies/:id`, `GET /methodologies/:id/decoded`.   |
| `services/methodologies.service.ts`                        | Delegates to PG repos.                                                              |
| `repositories/pg-methodology.repository.ts`                | Filters/sort/pagination over `business_view` METHODOLOGY rows + LEFT JOINs `policy_decode_status` + `mv_methodology_stats`. |
| `repositories/pg-policy-schema.repository.ts`              | `findDecoded(topicId)` — joins `policy_decode_status` + the confirmed `policy_schema`. Resolves URL-passed instance topic → policy topic. |
| `dto/decoded-methodology.dto.ts`                           | Builds the `/decoded` response. Translates raw `projectSchemaConfig` jsonb into `projectSchema.resolvedFields` + filtered `fieldMap` + `availableSchemas`. |

### Frontend (`frontend/`)

| File                                                 | Role                                                                       |
|------------------------------------------------------|----------------------------------------------------------------------------|
| `pages/methodologies/index.vue`                      | Listing page with a Decoded column + status filter.                        |
| `pages/methodologies/[id].vue`                       | Detail page with a Decoded Mapping tab (renders `resolvedFields` table + `availableSchemas` fallback). |
| `composables/api/useMethodologiesApi.ts`             | Methodology list/get with reactive filters.                                |
| `composables/api/useDecodedMethodologyApi.ts`        | `/decoded` fetch + types.                                                  |

---

## Key invariants and assumptions

1. **`policy_decode_status` is the source of truth for decode state.** Nothing else stores `sectoralScopes`, `emissionReductionApproach`, `schemaLabelMap`, `fieldMap`, `projectFieldMap`, or `projectSchemaId`. Earlier versions also wrote these to `business_view.businessData`; that's been removed.
2. **A VC-Document is only IPFS-fetched after its policy has `decodeStatus = 'success'`.** This is enforced by `MessageProcessProcessor.enqueueVcIpfsFetchIfReady` and the post-decode backfill in `PolicyDecodeProcessor`. Net effect: when a VC's `documents` becomes non-null, the policy is guaranteed to have decoded.
3. **PROJECT rows are produced exclusively by `ProjectMapperService.upsertProjectFromVc`**, called from `IpfsFetchProcessor`. The periodic `BusinessViewBuilderProcessor` no longer touches PROJECT rows.
4. **Topology resolution from a child topic to its parent policy** uses recursive walks of `Topic` messages stored in `message`. Cap is 12 hops. If the chain breaks (a missing parent message), the VC IPFS fetch is deferred indefinitely until the chain is repaired.
5. **`projectKey`** (the dedup column on `business_view`) is `${name}|${lat4}|${lng4}` when coordinates exist, else `${name}|${country ?? '_'}`. The `(viewType='PROJECT', projectKey)` partial unique index makes upsert merge VCs into one PROJECT row.

---

## Operational notes

### Speeding up backlog catch-up

- Increase `WORKER_IPFS_CONCURRENCY` (default 3). The IPFS gateway is the usual bottleneck.
- Add public IPFS gateways to `IPFS_GATEWAYS` so unpinned-locally CIDs don't block: `IPFS_GATEWAYS=http://localhost:8080/ipfs/,https://w3s.link/ipfs/,https://nftstorage.link/ipfs/,https://ipfs.io/ipfs/`.

### Resetting decode

- `DELETE FROM policy_decode_status WHERE status='failed';` and restart — `SyncSchedulerService.schedulePolicyDecodeJobs` re-enqueues anything missing.
- To force a complete re-decode of a single policy: delete its `policy_schema` rows + its `policy_decode_status` row, then manually enqueue a `policy-decode` job (or wait for the scheduler's next boot).

### Common decode failures

| Error fragment                                  | Cause                                                                 | Fix                                       |
|-------------------------------------------------|------------------------------------------------------------------------|-------------------------------------------|
| `All IPFS gateways failed for CID …`            | None of the configured gateways had the CID.                            | Add public gateway(s) to `IPFS_GATEWAYS`. |
| `"[object Object]" is not valid JSON`           | (Historical, fixed.) `JSON.parse` was called on an already-parsed jsonb column. | Ensure you're on a build after the `ensureObject` fix in `policy-decode.processor.ts`. |
| `LLM mapping failed: …`                         | Field mapper's LLM fallback errored. Deterministic matches survive — it's logged at `warn`. | Verify `GEMINI_API_KEY` / `OPENAI_API_KEY` if you want LLM coverage. |

### Useful diagnostic queries

```sql
-- Snapshot of pipeline state
SELECT
  (SELECT COUNT(*) FROM topic_cache)                                              AS topics_known,
  (SELECT COUNT(*) FROM message)                                                  AS messages_parsed,
  (SELECT COUNT(*) FROM policy_schema)                                            AS schemas_imported,
  (SELECT COUNT(*) FROM policy_decode_status WHERE status='success')              AS policies_decoded_ok,
  (SELECT COUNT(*) FROM policy_decode_status WHERE status='failed')               AS policies_decoded_failed,
  (SELECT COUNT(*) FROM message WHERE type='VC-Document')                         AS vcs_total,
  (SELECT COUNT(*) FROM message WHERE type='VC-Document' AND documents IS NOT NULL) AS vcs_fetched,
  (SELECT COUNT(*) FROM business_view WHERE "viewType"='PROJECT')                 AS projects;

-- Which decoded policies have no project schema confirmed (no anchor found)
SELECT "policyTopicId", attempts, "lastAttemptAt"
FROM policy_decode_status
WHERE status='success' AND "projectSchemaId" IS NULL;

-- Decode failure breakdown
SELECT
  CASE
    WHEN error LIKE 'All IPFS gateways failed%' THEN 'IPFS gateway unreachable'
    WHEN error LIKE '%not valid JSON%'           THEN 'JSON parse error'
    ELSE 'Other'
  END AS category, COUNT(*)
FROM policy_decode_status WHERE status='failed' GROUP BY category;
```

---

## Glossary

- **HCS** — Hedera Consensus Service. Append-only message log.
- **Topic** — an HCS message stream identified by a topic ID (e.g. `0.0.1368856`). Messages within a topic are sequenced.
- **Standard Registry** — Guardian's term for an issuing organization (Verra, Gold Standard, etc.). Each registry publishes from a registry topic.
- **Instance-Policy** — Guardian's term for a published policy/methodology. Has a canonical message with `action='publish-policy'` and a ZIP CID in `files`.
- **VC** (Verifiable Credential) — JSON-LD credential issued by a project under a policy. Carries the project's data: name, location, credits, etc.
- **Policy ZIP** — IPFS-hosted archive containing a policy's `policy.json` + `*.schema.json` files. Decoded by `PolicyDecodeProcessor`.
- **Project anchor schema** — the one schema per policy that the cross-schema fuzzy matcher decided owns the most project-attribute fields. VCs of this schema become PROJECT rows.
- **Sibling schema (Shape C)** — a schema whose top-level property `$ref`s the project anchor schema. Its VCs can also be project-bearing — `ProjectMapperService` resolves them via `buildSchemaEntryImproved`.
