# Codebase Memory — live module topology (update when files change)

Stack: NestJS 11 (worker + api + guardian-sync), TypeORM 0.3 (Postgres), BullMQ (Redict),
Nuxt 3 frontend. TS strict, ts-jest. Path aliases `@shared/* @api/* @worker/*`.
Git root is the parent `guardian/` dir; paths show `sustainability-atlas/...`.

Three deployable Node processes off one `src/`: **worker** (`src/worker/main.ts`),
**api** (`src/api/main.ts`), **guardian-sync** (`src/guardian-sync/main.ts`, opt-in).

## Worker — ingest pipeline

- `src/worker/processors/` — 8 BullMQ processors: topic-sync, message-process, ipfs-fetch,
  policy-decode, token-sync, business-view-builder, mv-refresh, project-reparse.
- `src/worker/services/` — hedera, ipfs, project-mapper, reverse-geo, queue-autoscaler,
  `storage/` (PolicyZipStorage; local FS behind an interface).
- `src/worker/schedulers/sync-scheduler.service.ts` — onModuleInit scheduling, leader election.
- `src/worker/worker.module.ts` — DI registration. New @Injectables go in `providers[]`.
  Per-queue `removeOnComplete`/`removeOnFail` are wired into `registerQueue` defaultJobOptions
  here — without that, retention configured in bullmq.config is silently ignored.

## Worker — project mapping subsystem

- `src/worker/services/project-mapper.service.ts` — per-VC upsert into `business_view`.
  Delegates project-key resolution to `ProjectKeyResolverChain`; the graph-walk helpers that
  used to live here have been migrated to `base-resolver.ts` and deleted from the service.
  Holds `docTypeForSchema()` (L680), the extraction guard (L278-294), the big
  INSERT…ON CONFLICT upsert and the orphan-cleanup DELETE — **preserve the upsert SQL verbatim**.
- `src/worker/project-mapper/` — helpers.ts, improved-heuristic.mapper.ts, schema-classifier.ts,
  document-type-classifier.ts, non-project-credential.ts, project-fields.ts
  (`PROJECT_EXTRACT_FIELDS` / `ProjectFieldKey`), types.ts (`DocumentType`, FieldDef, SchemaEntry),
  topic-classifier.ts, mint-project-linker.ts.
- `src/worker/project-mapper/resolvers/` — resolver.types.ts, circuit-breaker.ts, base-resolver.ts
  (abstract `BaseProjectKeyResolver`), the four strategies, resolver-chain.service.ts.
  Chain order M1→M4, first `resolved` wins: `dynamic-topic` (`topic`) → `cs-ref` (`csRef`) →
  `relationships` (`relationships`) → `project-schema` (`projectSchema`). One `CircuitBreaker`
  per strategy (threshold 5, cooldown 30 s).
- `src/worker/mapping/` — policy-pipeline.service.ts (decode-time stamping), policy-pipeline.types.ts
  (`PolicyMapping`, `PolicyMappingEntry`, `FlattenedSchemaField`), classify-schema-type.ts,
  flatten-schema-fields.ts, derive-project-meta.ts, mapping-pipeline.service.ts, mapping.module.ts,
  `strategies/map-fields/` (3 strategies; default `CROSS-SCHEMA-FUZZY`).
  **The schema-labelling pass (`IMapSchemasStrategy`, `MAP_SCHEMAS_METHOD`) was removed** — only
  field mapping remains.

Design write-up: `docs/architecture/decode-method.md`.

## guardian-sync (opt-in process)

`src/guardian-sync/` — guardian-event-subscriber.service.ts (AEM HTTP chunked stream via axios),
guardian-event-router.ts, guardian-event-log.service.ts, guardian-instance.types.ts,
guardian-sync.module.ts, main.ts. Runs only when `GUARDIAN_INSTANCES` is set.
**Trigger-only**: events enqueue targeted IPFS_FETCH / TOKEN_SYNC / TOPIC_SYNC jobs; no Guardian
event carries a Hedera `consensusTimestamp`, so the normal pipeline still materialises canonical
rows. Runs with `synchronize:false` (the worker owns schema sync). Writes an append-only audit to
`guardian_event_log`, surfaced via `GET /:network/guardian-sync/events`.

## API

`src/api/` — account, admin, auth, controllers, database, dto, mail, notifications, queues,
repositories, services. Notable: `services/policy-graph.builder.ts` (pure, unit-tested),
`repositories/pg-project.repository.ts`.

## Shared

`src/shared/` — config, database (incl. `schema-bootstrap.ts`, raw index creation), entities,
materialized-views, redis, security, utils, vc-detail.
Entities: business-view, message, message-cache, policy, topic-cache, token-cache, nft-cache,
ipfs-file, ipfs-fetch-failure, guardian-event-log, synchronization-task, log, plus `auth/`.

## Frontend

`frontend/` — Nuxt 3. See `frontend/README.md` for layout. Project page tabs (Pipeline /
Advanced) read `linkedSchemas`, `decodeMethod`, `metadata`, `issuanceEvents` off the project DTO.

## Tests — real status (verified, not assumed)

`npx tsc --noEmit` → **TSC_EXIT:0** (clean).
`npx jest` → **132 passed, 5 failed, 137 total; 13 suites pass, 3 fail.** ~54 s.

The 3 failing suites are pre-existing and unrelated to current work — gate on
"tsc 0 AND no failures beyond these three":

| Suite | Why it fails |
|---|---|
| `test/unit/worker/mapping/map-schemas.strategy.spec.ts` | **Tests deleted code.** Imports `MapSchemasMethodType` / `IMapSchemasStrategy` / `map-schemas.provider`, none of which exist since the schema-mapping pass was removed. Permanently broken — should be deleted, not fixed. |
| `test/unit/worker/mapping/map-fields.strategy.spec.ts` | L259 calls `execute()` with 3 args; the signature takes 2. Stale vs the mapping refactor. |
| `test/unit/message-parser.spec.ts` | 5 failing assertions around Policy field extraction, `tokens` array, discoverable topics and token dedup. |

16 spec files under `test/unit/**`, `@jest/globals`, no real DB. tsconfig excludes `test/`, so
`tsc --noEmit` covers `src/**` only; jest compiles tests via ts-jest.

## Operational lessons worth not relearning

- Any uniquely-named recurring BullMQ job **must** set `removeOnComplete` — a keep-alive job
  re-enqueued per poll cycle grew the completed set past 600k and OOM'd Redict.
- Do **not** set `priority` on topic-discovery enqueues. BullMQ's blocking worker drains the
  always-non-empty `wait` list and never falls through to `prioritized`, starving discovery —
  which presents as "0 projects after hours" with the rest of the pipeline healthy.
- Resolver/linker changes need a worker restart; existing rows keep their old key and
  `decodeMethod` until reparsed (`BACKFILL_PROJECTS_ON_BOOT=true` once, or the reparse endpoint).
- For client-only DOM libs in Nuxt, `nuxi build` passing is not a sufficient gate — `.client.vue`
  stops render, not module load. Verify by running `node .output/server/index.mjs` and curling the
  consuming page.
