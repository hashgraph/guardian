# Codebase Memory — live module topology (update when files change)

Stack: NestJS 11 (worker + api + guardian-sync), TypeORM 0.3 (Postgres), BullMQ (Redict),
Nuxt 3 frontend. TS strict, ts-jest. Path aliases `@shared/* @api/* @worker/*`.
Git root is the parent `guardian/` dir; paths show `sustainability-atlas/...`.

Three deployable Node processes off one `src/`: **worker** (`src/worker/main.ts`),
**api** (`src/api/main.ts`), **guardian-sync** (`src/guardian-sync/main.ts`, opt-in).

## Worker — ingest pipeline

- `src/worker/processors/` — 10 BullMQ processors: topic-sync, topic-sync-priority, message-process,
  ipfs-fetch, policy-decode, token-sync, retire-sync, business-view-builder, mv-refresh,
  project-reparse.
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
  topic-classifier.ts, mint-project-linker.ts, serial-mint-linker.ts.
- **Credit lifecycle (mint / retire / transfer)** — design + business rules in
  `docs/architecture/credit-lifecycle-tracking.md`. Read it before touching any of:
  `serial-mint-linker.ts` (reconciles declared vs actually-minted; writes `minted_amount`,
  `mint_match_status`, serial/retired/transferred counts), `retire-sync.processor.ts` +
  `services/retire-event.decoder.ts` (ABI-decodes Guardian RETIRE contract events),
  `token-sync.processor.ts` (serials, owners, fungible mint txs, and the `treasury-transfers` job).
  Non-obvious invariants: only serials traceable to a synced Guardian MintToken VC are tracked;
  token `total_supply` is **not** "minted" (it is net of retirements); a fungible retirement can
  never be attributed to a specific mint event; counts are `null` not `0` when unknowable.
  Transfers are swept **per treasury account, not per token** — Mirror Node has no per-token transfer
  feed and one treasury issues hundreds of tokens. State is `token_cache."transferTxWatermark"`
  written across the whole treasury (deliberately no separate table) with `"createdTimestamp"` as the
  walk's lower bound. "How many transferred" comes from current ownership and is **not** derived from
  `token_transfer_event`: the log is sweep-dependent and counts credits later retired.
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
**Trigger-only**: events enqueue targeted IPFS_FETCH / TOKEN_SYNC / TOPIC_SYNC_PRIORITY jobs; no
Guardian event carries a Hedera `consensusTimestamp`, so the normal pipeline still materialises
canonical rows. Runs with `synchronize:false` (the worker owns schema sync). Writes an append-only
audit to `guardian_event_log`, surfaced via `GET /:network/guardian-sync/events`.
Requires `HEDERA_NET` to match one of `GUARDIAN_INSTANCES`' networks or it boots IDLE (logs a clear
warning but doesn't fail) — same as the worker, one process per network.

## API

`src/api/` — account, admin, auth, controllers, database, dto, mail, notifications, queues,
repositories, services. Notable: `services/policy-graph.builder.ts` (pure, unit-tested),
`repositories/pg-project.repository.ts`.

## Shared

`src/shared/` — config, database (incl. `schema-bootstrap.ts`, raw index creation), entities,
materialized-views, redis, security, utils, vc-detail.
Entities: business-view, message, message-cache, policy, topic-cache, token-cache, nft-cache,
ipfs-file, ipfs-fetch-failure, guardian-event-log, synchronization-task, log, plus `auth/`.

Tables owned by `schema-bootstrap.ts` with **no entity** — deliberate: TypeORM `synchronize` cannot
drop columns it doesn't know about (it has silently dropped one before). `project_mint_link`,
`token_mint_tx`, `token_retire_event`, `token_transfer_event`, `contract_cache`, `project_geometry`,
`notification_watermarks`, `mv_registry`. A column added here that *also* belongs to an entity table
(e.g. `nft_cache.accountId`, `token_cache.mintTxWatermark`) **must** be declared on the entity too,
or synchronize will drop it.

## Frontend

`frontend/` — Nuxt 3. See `frontend/README.md` for layout. Project page tabs (Pipeline /
Advanced) read `linkedSchemas`, `decodeMethod`, `metadata`, `issuanceEvents` off the project DTO.

## Tests — real status (verified, not assumed)

`npx tsc --noEmit` → **TSC_EXIT:0** (clean).
`npx jest` → **146 passed, 5 failed, 151 total; 14 suites pass, 3 fail.** ~55 s.

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
- Do **not** set `priority` or `lifo` on TOPIC_SYNC to fast-track a job. Confirmed twice now (once
  as "0 projects after hours", once as a lone job stuck in `state: prioritized` for 10+ min): the
  worker drains the always-non-empty plain `wait` list and never/rarely falls through to
  `prioritized`; `lifo` jumps forward once but its queue position then grows again as routine churn
  keeps landing at the same end. The actual fix is a **physically separate queue**
  (`TOPIC_SYNC_PRIORITY` — root/registry topic, guardian-sync event syncs, and topics discovered
  from priority-lane messages via `oneTimePriority`, see below) instead of ordering tricks inside
  the 100k+-job bulk queue.
- `TOPIC_SYNC`'s concurrency default (5) and the autoscaler's ceiling formula (`baseline*4` in
  `queue-autoscaler.service.ts`, so 5→20) were both far too small for 100k+ testnet topics — the
  queue grew into a multi-million backlog (all genuinely "waiting", not stuck "delayed") that
  starved *every* topic sitting behind it, including topics newly discovered via
  `message-process.processor.ts`'s child-topic discovery. Symptom looked exactly like "guardian-sync
  triggers fine, but only the one triggered topic ever actually fetches" — the topic guardian-sync
  routes gets priority treatment, but the related topics discovered *from* its messages (schemas,
  sub-instances) landed on the bulk queue behind the backlog. Fixed two ways together: raised the
  default concurrency to 20 (`WORKER_TOPIC_CONCURRENCY`, also in `.env`/`.env.example` since an
  explicit override there masks a code-default bump), and made topic discovery lineage-aware:
  `MESSAGE_PARSE` job data carries `fromPriorityLane` (set by whichever topic-sync processor found
  the message), and `message-process.processor.ts` only gives a discovered topic
  `oneTimePriority: true` (routes to `TOPIC_SYNC_PRIORITY`) when `fromPriorityLane` is true —
  topics discovered from an ordinary bulk-crawl message stay on the bulk queue. This keeps the
  priority lane scoped to guardian-sync's own lineage instead of absorbing the whole crawl. A
  `oneTimePriority` topic still hands itself back to bulk once caught up (empty poll or partial
  page), so it doesn't inherit bulk's steady-state growth either. If `.env` pins
  `WORKER_..._CONCURRENCY` or `WORKER_..._MAX_CONCURRENCY`, remember to update it there too — env
  always wins over the code default.
- `topic_cache` rows that keep returning empty polls back off exponentially
  (`emptyPollStreak` in topic-sync job data, capped by `MIRROR_NODE_MAX_POLL_DELAY`) — a flat
  interval across 100k+ testnet topics is not sustainable and 429s the mirror node.
- Two `nest start --watch` processes (e.g. worker for mainnet + worker for testnet) compile into
  the **same shared `dist/`** and can ping-pong-restart each other on every recompile, occasionally
  racing a `bootstrapSchema()` DDL statement into a crash. For running multiple network instances
  side by side, prefer `yarn build` once + `start:worker`/`start:api`/`start:guardian-sync`
  (compiled, no watch) over multiple concurrent `dev:*` watchers.
- `schema-bootstrap.ts` runs on every process boot (api + every worker) — any `ALTER TABLE` there
  must be guarded by an `information_schema.columns` existence check (not just
  `IF NOT EXISTS`, which still needs the `ACCESS EXCLUSIVE` lock) or concurrent boots queue behind
  each other's lock, and any `DROP INDEX` + `CREATE INDEX` pair needs `IF NOT EXISTS` on the
  create too or a concurrent winner's index causes a duplicate-key crash on boot.
- Resolver/linker changes need a worker restart; existing rows keep their old key and
  `decodeMethod` until reparsed (`BACKFILL_PROJECTS_ON_BOOT=true` once, or the reparse endpoint).
- `CREATE TABLE IF NOT EXISTS` is **not** race-safe in Postgres — two boots running
  `bootstrapSchema` concurrently produced a duplicate-key error on `pg_type`. Transient (the next
  boot succeeds), but don't trust the "replicas race safely" comment for CREATE TABLE.
- Mirror Node's `/transactions` endpoint, ascending: a range wider than it will scan returns an
  **empty page, not an error** (`gte:0` returns nothing for an account that demonstrably has
  transactions) — anchor the first query to the token's `created_timestamp`. And an empty page is
  **not** end-of-history: it walks fixed time windows and still returns a live `links.next`, so
  follow the link rather than breaking on a short page. Both cost real debugging time.
- Contract logs call the timestamp field `timestamp`; transactions call it `consensus_timestamp`.
- A backfill over `nft_cache` cannot run to completion at boot (5M rows, ~4 s/batch just to find
  candidates). `schema-bootstrap.ts` time-budgets it and resumes next boot; the scheduler's NFT
  re-sync fills the rest through the normal write path.
- Guardian's AEM docs (`docs/guardian/standard-registry/external-events/...` in the parent `guardian/`
  repo) show `ipfs_added_file`'s payload as `{cid, url}`, but the actual publish call
  (`worker-service/src/api/worker.ts`: `this.publish(ExternalMessageEvents.IPFS_ADDED_FILE, cid)`)
  sends the bare CID **string**, and the AEM HTTP layer (`application-events/src/routes/events.ts`)
  forwards NATS payloads untouched — no wrapping. `guardian-event-router.ts`'s `route()` nulls out
  any non-object payload before dispatch, so `onIpfsAdded` silently got `null` every time: 810 events
  received, 0 triggers logged, no debug output (the early-return had no log line). Symptom looked
  like "IPFS fetches aren't syncing" with no error anywhere. Fixed by passing the raw `payload`
  through for this event and accepting both a bare string and `{cid}`. **Lesson: verify an AEM
  event's payload shape against the actual publish call in the sibling `guardian/` source, not the
  docs** — the docs are aspirational/stale for at least this one event.
- Nuxt composables (`useRuntimeConfig()`) must be called during setup. Calling one inside a function
  fired from a click handler throws "nuxt instance unavailable" *before* any try/catch, so a loading
  flag never clears and the UI hangs with nothing in the console.
- For client-only DOM libs in Nuxt, `nuxi build` passing is not a sufficient gate — `.client.vue`
  stops render, not module load. Verify by running `node .output/server/index.mjs` and curling the
  consuming page.
