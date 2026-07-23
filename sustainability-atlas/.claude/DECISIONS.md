# DECISIONS — deviations from AGENT-PROMPT.md with rationale

## D1 — Reordered Phase 1 tasks so topic-classifier (R2) is built before base-resolver (R1)
**Prompt says:** Task 1.1 = create resolver.types.ts + circuit-breaker.ts + base-resolver.ts;
Task 1.2 = topic-classifier.ts.
**Deviation:** Split into 1.1 (types + circuit-breaker), 1.2 (topic-classifier), 1.3
(base-resolver) — topic-classifier moved ahead of base-resolver.
**Why:** `base-resolver.ts` constructor signature is `(dataSource, topicClassifier:
TopicClassifierService)` and `confirmProjectKey()` calls the classifier. If base-resolver is
written before TopicClassifierService exists, `npx tsc --noEmit` fails on the missing import —
violating hard-constraint #7 ("tsc clean after every task"). Reordering preserves the green-gate
discipline with zero change to the final file set or design.

## D2 — `document-type-classifier.ts`, `classifyDocumentType`, and `PolicyMappingEntry.docType` do NOT exist yet
**Prompt says (Codebase Context, lines 102–117):** "`PolicyMappingEntry` (already has
`docType?: string` field)" and "`src/worker/project-mapper/document-type-classifier.ts` exists
and is correct; it is NOT wired into `policy-pipeline.service.ts` yet."
**Reality (verified):** `glob src/worker/project-mapper/**` shows NO document-type-classifier.ts
(there is `schema-classifier.ts` instead). `grep classifyDocumentType|DocumentType|
document-type-classifier` matches ONLY `.claude/AGENT-PROMPT.md`. The actual
`policy-pipeline.types.ts` `PolicyMappingEntry` has NO `docType` field.
**Decision:** Task 1.6 (R5) will, in addition to wiring, FIRST create
`document-type-classifier.ts` with the `DocumentType` union (per R5) and a
`classifyDocumentType(schemaName, schemaId, fieldDefMap)` heuristic, and ADD `docType?: string`
to `PolicyMappingEntry`. The classifier heuristic will be designed when we reach Task 1.6
(needs the schema field shape). This is unavoidable: R5 cannot "wire in" a file that is absent.
Recorded so the deviation is traceable; no scope beyond what R5 requires.

## D3 — Phase 1 leaves ProjectMapperService constructor unchanged (R7 split across phases)
**Prompt says (R7):** register new providers AND "update its injected dependencies by adding
ProjectKeyResolverChain to its constructor."
**Decision:** In Phase 1 Task 1.7, register the providers ONLY. The constructor change +
chain usage land together in Phase 2 Task 2.1 (R6), where the service body actually calls
`resolverChain.resolve(ctx)`.
**Why:** Phase 1 is explicitly "backend, no behaviour change." Injecting an unused chain into
the service in Phase 1 would be dead wiring and risks an unused-import lint hit; doing it in
Phase 2 alongside the body rewrite keeps each phase coherent. Final state is identical to the
prompt's intent.

## D5 — docType classified by NAME heuristic (user-reviewed and endorsed)
**Context:** R5 requires a `docType` per schema, but the existing policy mapping only carries
`schemaType` (project/mintToken/standardRegistry/other) + `isProjectSchema` — it does NOT
distinguish PDD / MonitoringReport / ValidationReport / VerificationReport. R6's validation-report
guard and the Phase 5 pipeline ordering both need that finer label, so a classifier is unavoidable.
**Question raised by user (2026-06-04):** "since we already have proper policy mapping, do we need
these hardcoded [DocumentType] ones again?"
**Findings:** (1) the mapping cannot supply docType — nothing to reuse. (2) The worker reads no
authoritative Guardian type field; `RawSchema` exposes only name/description/document. (3) The
existing `classifySchemaTypeByName` is itself a name heuristic, so `classifyDocumentType` mirrors an
established pattern and is orthogonal to `schemaType` (lifecycle-role vs data-class).
**Decision:** Keep the name-based `classifyDocumentType` as implemented in Task 1.6. User chose
"Keep name heuristic" after being shown the metadata-driven and remove-entirely alternatives.
**Upgrade path (deferred):** if a methodology misclassifies, source docType from authoritative
metadata (schema `entity`/`category`, or policy.json workflow-block roles) — out of scope for R5.

## D6 — `isDateOnlySource` defined as monitoring/verification reports (prompt left it undefined)
**Context:** R6 instructs the extraction-loop guard
`if (isDateOnlySource && !DATE_ONLY_FIELD_KEYS.has(field.key)) continue;  // only dates/credits`
but never defines `isDateOnlySource`. `DATE_ONLY_FIELD_KEYS` = {vintageRaw, creditingPeriod,
creditingPeriodStart, creditingPeriodEnd}.
**Decision:** `isDateOnlySource = vcDocType === 'monitoringReport' || vcDocType === 'verificationReport'`.
Rationale: periodic reports (monitoring/verification) should contribute only crediting-period dates
+ credits (ER_y handled separately), never descriptive fields (name/country/etc.) — their
host_countries[] etc. are the noise the pipeline guards against. pdd/registration remain the source
of descriptive fields; validationReport contributes nothing (separate `break`).
**Adjustability:** single boolean expression; easy to narrow to monitoring-only if a methodology
needs verification reports to contribute descriptive data.

## D7 — Phase 5 uses REAL endpoint/field names, not the prompt's stale ones
The prompt's Part 2 references `/projects/:id/linked-vc/:ts` and `project.schemas`. The actual API
route is `GET /:id/linked-vcs/:consensusTimestamp` (plural) and the frontend field is
`project.linkedSchemas`. Phase 5 uses the real names. Not a judgment call — the prompt is simply out
of date.

## D8 — docType exposed to frontend by REUSING the stamped value (not re-classified) — user choice
The Pipeline needs lifecycle ordering, but `linkedSchemas` carried no docType. User chose "expose
backend docType via API" (over a client-side heuristic or timestamp-only). Implementation threads the
docType ALREADY stamped on policyMapping entries (Phase 1 R5) through `PolicySchemaRow.docType` →
`LinkedSchemaDto.docType` → frontend `LinkedSchema.docType`. No second classification anywhere —
directly honours D5 (don't duplicate the doctype heuristic).

## D9 — Task 5.1 implemented FULLY (backend + frontend) — user choice
The prompt assumed the activity API returns schemaName; it does NOT (ActivityEventDto consumes it
server-side to derive action/type, then drops it). User chose "implement fully": add
`schemaName: string | null` to the backend `ActivityEventDto` output AND the frontend `ActivityEvent`
+ `mapActivityEvent`. (Note: the Pipeline itself reads `linkedSchemas`, not the activity feed; this
just surfaces schema names in the Advanced-tab activity log.)

## D10 — Phase 5 frontend gated by `npx nuxi typecheck` — user choice
frontend/package.json has no typecheck/lint script. User chose to set one up. Baseline captured
before changes (frontend may have its own pre-existing type errors, treated as a frozen baseline like
the jest one). Backend Phase 5 tasks still gate on tsc+jest.

## D11 — Live-DB debug (2026-06-05): "0 projects after 6–7h" = pre-existing crawler starvation, NOT the resolver chain
**Symptom:** mainnet_sustainable_explorer had 0 PROJECT business_view rows (CREDIT/METHODOLOGY/REGISTRY fine).
**Diagnosis (from live Postgres + Redict):** only 63 VC-Documents ingested, all 46 fetched ones were
StandardRegistry profile VCs (correctly skipped). ~52 instance topics (where project VCs live) NOT in
topic_cache. `mirror-node-topics-mainnet` had 212 first-time discovery jobs (`topic-{id}-0`,
`priority:10`) FROZEN in the BullMQ `prioritized` set (0 throughput across 100k+ completed poll jobs),
while the worker drained a never-ending `wait` stream of `-poll-` re-syncs of the 144 known topics.
**Root cause:** `message-process.processor.ts` enqueued discovered topics with `priority:10`. BullMQ's
blocking worker keeps draining the always-non-empty `wait` list and never falls through to
`prioritized` → discovery starved → project topics never crawled → nothing for the mapper to map. This
is PRE-EXISTING crawler code (not our resolver/R12 work), exposed by mainnet's large topic tree.
**Fix:** removed the `priority` option from the discovery enqueue so discovery rides the same `wait`
FIFO (processed in seconds, unstarved). One line. tsc 0, jest 65/5. Deploy = rebuild+restart worker;
R12 on boot remove-then-adds the ~203 stuck orphans into `wait`, draining the backlog.
**Secondary issues noted (follow-ups, not the blocker):** 17 IPFS fetch failures; 21 policy-decode
failures; `isProjectSchema=false` on every decoded policy's mapping (docType stamping works) — the last
could limit mapping for shared-topic policies once ingestion flows (dynamic-topic policies map via M1).

## D4 — Migrated graph-helpers temporarily duplicated between base-resolver and the service
**Context:** Phase 1 Task 1.3 COPIES resolveViaRef / resolveViaRelationships /
isCsIdReferencedByOtherVcs / isCsIdOnProjectSchema into `base-resolver.ts`. The originals stay
in `project-mapper.service.ts` until Phase 2 Task 2.2 deletes them (per R6 "Remove" list).
**Why:** Keeps Phase 1 a pure additive, no-behaviour-change step; the service still works off
its own private copies until the chain takes over in Phase 2. Hard-constraint #4 (no
backwards-compat shims) is honoured because the duplicates are DELETED in 2.2, not aliased.

## D12 — Guardian event-sync (2026-06-22): AEM HTTP stream, trigger-only, composite-network isolation
**Context:** New feature — ingest Guardian's native event stream to cut mirror-node load, support
multiple Guardian instances, and use tracking ids to follow project flow. Plan + file map in
`.claude/EVENT-SYNC-PLAN.md` + `.claude/event-sync-memory.md`. Backend Phases 1–6 implemented.
**Decisions (deviations / load-bearing choices):**
1. **AEM HTTP stream over direct NATS.** The new `guardian-sync` process consumes the Application
   Events Module chunked stream (`GET <aem>/api/events/subscribe`) with the existing `axios` —
   honouring the no-new-npm-dep hard constraint. A `nats` client was rejected.
2. **Trigger-only, never direct ingest.** No Guardian event carries a Hedera `consensusTimestamp`
   (the `message` UNIQUE key + credit-dedup key), so events only enqueue targeted IPFS_FETCH /
   TOKEN_SYNC / TOPIC_SYNC jobs; the existing pipeline materialises the canonical row against the
   real timestamp from the targeted mirror fetch. The dormant `dataSource='guardian_api'→'both'`
   merge is left intact and unused.
3. **Composite-network isolation key** `${instanceTag}-${hederaNet}` (e.g. `acme-mainnet`) — reuses
   `qname()` / `resolveDatabaseName()` / the `:network` route with ZERO schema migration. NO
   `sourceInstanceId` column. v1 = one `guardian-sync` process per instance (mirrors one-worker-per
   -network); `QUEUE_NAMES` is a static module-load constant, so single-process fan-out is deferred.
4. **trackingId is authoritative only for an ACTIVE API caller.** A passive observer can't map it,
   so M0 + the correlation store key on `(policyId, userId, time-window)` as the universal fallback
   and trackingId when present. M0 `TrackingIdResolver` is prepended to the chain, PASSES on miss,
   and NEVER rejects — strictly additive recall, no M1–M4 regression. **Open: confirm active vs
   passive (Phase 0, live AEM) before relying on trackingId.**
5. **guardian-sync runs with `synchronize:false`** (the worker owns schema sync — avoids two
   concurrent TypeORM synchronizers on one DB); it runs `bootstrapSchema` once at boot (idempotent,
   non-fatal) so `guardian_correlation` exists even if it boots before its worker.
6. **Discovery enqueues set NO `priority`** (reaffirms D11) and every enqueue sets `removeOnComplete`
   (Redict-OOM lesson). The subscriber NEVER throws / crashes the process; a dead instance falls back
   to poll-only and cannot affect the worker/API. The process is OPT-IN (only runs with
   `GUARDIAN_INSTANCES` set; compose block is commented out).
**Out of scope (no live Guardian):** Phase 0 live-AEM payload discovery and runtime validation of the
subscriber. Undocumented `policy-*` payloads are handled defensively (coarse fallback, never parse
unverified nested fields, never throw).

**Amendment (2026-06-24) — instance dataset decoupled from id (supersedes point 3's default).**
`GuardianInstanceConfig.network` (the SE dataset/queue namespace an instance feeds, matched against the
process `HEDERA_NET`) now defaults to `hederaNet`, NOT the composite id. So multiple instances on the same
Hedera net SHARE one dataset by default — e.g. `GUARDIAN_INSTANCES=local-testnet,deploy-testnet` (both
`hederaNet=testnet`) both stream into the shared `testnet` worker/DB under one `HEDERA_NET=testnet`
guardian-sync process (one leader lock `se:guardian-sub:leader:testnet`, one stream per instance id).
Isolation is now OPT-IN via `GUARDIAN_<ID>_NETWORK=<unique>` + a dedicated worker at that `HEDERA_NET`.
Rationale: the id-as-dataset-key default was unintuitive and blocked the common "N Guardians on one network"
case (user hit `guardian-sync IDLE` because composite ids never matched `HEDERA_NET=testnet`). The id is now
purely a unique label (env keys, per-stream/leader disambiguation).

**Amendment 2 (2026-06-24) — M0 removed; correlation table → audit log (supersedes point 4 + the prior
correlation work).** The M0 `TrackingIdResolver` and the whole `guardian_correlation` mechanism are DELETED.
Why: trackingId is per-ACTION (each SET_BLOCK_DATA gets a new one), so it can't group a project's documents;
the resolver actually keyed on `(policyId, userId)`, which is too COARSE (a user's multiple projects under one
policy would mis-merge); and the `projectKey` write-back that would have made it work was never wired. So events
are now **trigger-only** and project linking is left entirely to the proven on-chain topology mappers (M1–M4).
Removed: `tracking-id.resolver.ts` (+spec), M0 from `resolver-chain.service.ts`, `policyId`/`userId`/`trackingId`
from `resolver.types.ts`, the ctx fields in `project-mapper.service.ts`, the ipfs-fetch back-link, the worker.module
registration, `GuardianCorrelationService`, `guardian-correlation.entity.ts`. Replaced with an append-only AUDIT:
`guardian_event_log` (`network, instanceId, subject, refType, refId, action, createdAt`) written by
`GuardianEventLogService` from the router for every event that TRIGGERS something (ignored events not recorded),
pruned by `GUARDIAN_EVENT_LOG_RETENTION_DAYS` (default 7). Surfaced via `GET /:network/guardian-sync/events` and a
"Recent triggers" table on the sync page. schema-bootstrap drops the old `guardian_correlation` table. The block_complete
→ targeted TOPIC_SYNC trigger (the part that always worked) is unchanged.

## D13 — cs.ref resolver (M2) now anchors on the project-schema VC, not the chain root (2026-06-24)
**Bug:** distinct projects under one registrant collapsed into ONE `business_view` PROJECT row (later projects
overwriting earlier ones via `ON CONFLICT (projectKey)`). Seen on the GCR / GS TPDDTEC methodology: each
per-project "Project Listing Application" (schemaIri `cada9c80`, `isProjectSchema=true`, unique cs.id) carries a
`cs.ref` to a per-developer "Project Developer Application" (`af33f97e`, NOT a project schema, the chain root).
`resolveViaRef` walked all the way to that root and keyed every sibling project on the **developer DID**.
**Fix:** `BaseProjectKeyResolver.resolveViaRef` gained `opts.projectSchemaUuids` + `opts.startIsProjectSchema`.
When provided, the walk **anchors on the project-schema VC** and stops as soon as the next ancestor is NOT a
project schema (seeded with the start VC when it is itself the project schema). `CsRefResolver` (M2) passes both.
This keeps reports linking to their project and preserves the multi-registration-merge case (climbing only
*through* contiguous project-schema VCs), while giving each project its own listing cs.id as the key. Without
`projectSchemaUuids` the behaviour is unchanged (the `resolveViaRelationships` internal call is untouched).
Gated: tsc 0; jest baseline + 2 new `cs-ref.resolver.spec` cases. **Existing merged rows need a reparse to
re-split** (BACKFILL_PROJECTS_ON_BOOT=true for one restart, or the methodology reparse endpoint).