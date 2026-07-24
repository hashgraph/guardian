# Dev Memory — implementation log (files changed, tsc/test status per task)

Baseline (pre-work): `tsc` exit 0 · jest = 46 passed / 5 failed / 51 total / 3 suites.
The 5 failures are PRE-EXISTING and out of scope:
`message-parser.spec.ts`, `map-fields.strategy.spec.ts`, `map-schemas.strategy.spec.ts`.
Gate going forward = tsc exit 0 AND jest no worse than this baseline.

## Task 1.1 — resolver.types.ts + circuit-breaker.ts — ✅ APPROVED
Created:
- `src/worker/project-mapper/resolvers/resolver.types.ts` — ResolutionContext,
  ResolutionOutcome (resolved|pass|reject), ResolvedProjectKey. Imports PolicyMapping from
  `../../mapping/policy-pipeline.types`.
- `src/worker/project-mapper/resolvers/circuit-breaker.ts` — `CircuitBreaker` plain class
  (NOT @Injectable) + `CircuitBreakerLogger` interface. `run<T>(fn, fallback)`: OPEN→fallback
  without calling fn; throw→counted+absorbed as fallback (never rethrows); success→CLOSED.
  `openedAt: number | null` (null = CLOSED sentinel; required so Date.now()===0 still reads OPEN).
Verified by architect: tsc exit 0; jest unchanged (5 failed/46 passed); only these 2 files added.

## Task 1.2 — topic-classifier.ts — ✅ APPROVED
`src/worker/project-mapper/topic-classifier.ts` — `TopicClassifierService` (@Injectable).
`classifyTopic(dataSource, topicId)`: cache → instance check (Instance-Policy.instanceTopicId) →
Topic msg parentId/name → dynamic-project (name ~/project/i + ancestor instance topic) → other.
Caches only definitive. 12-hop ancestor walk w/ visited set. Verified tsc 0, jest unchanged.

## Task 1.3 — base-resolver.ts — ✅ APPROVED
`src/worker/project-mapper/resolvers/base-resolver.ts` — abstract @Injectable
`BaseProjectKeyResolver(dataSource, topicClassifier)`. Outcome helpers resolved/pass/reject (use
`this.method`). Ported verbatim: resolveViaRef, resolveViaRelationships, isCsIdReferencedByOtherVcs,
isCsIdOnProjectSchema (now calls projectSchemaUuids; permissive empty-set→true). New:
projectSchemaUuids, isKnownProjectRow, confirmProjectKey (dynamic-topic→topicId, project-schema→csId,
known-row→csId, else null). Originals still in project-mapper.service.ts (deleted in 2.2). tsc 0.

## Task 1.4 — four resolver strategies M1–M4 — ✅ APPROVED
`resolvers/{dynamic-topic,cs-ref,relationships,project-schema}.resolver.ts`. Each @Injectable
extends base, explicit ctor `super(dataSource, topicClassifier)`, fixed `method`. M1 topic (no
over-merge guard), M2 csRef (reject 'cs.ref resolves to non-project-schema VC'), M3 relationships
(pass if !walked or unconfirmed), M4 projectSchema (reject 'not the project schema, no cs.ref/ancestor').
tsc 0, jest unchanged.

## Task 1.5 — resolver-chain.service.ts — ✅ APPROVED
`resolvers/resolver-chain.service.ts` — `ProjectKeyResolverChain` (@Injectable). Ctor (m1,m2,m3,m4);
one CircuitBreaker per strategy (5, 30_000, logger). resolve() runs M1→M4: resolved→ResolvedProjectKey,
reject→null+debug log, pass→next, all-pass→null. NestJS Logger accepted as CircuitBreakerLogger
structurally (no cast). tsc 0.

## Task 1.6 — document-type-classifier + docType wiring — ✅ APPROVED (user-endorsed, D5)
NEW `project-mapper/document-type-classifier.ts` (classifyDocumentType, name heuristic). NEW
`DocumentType` union appended to `project-mapper/types.ts`. Added `docType?: string` to
PolicyMappingEntry. Wired into policy-pipeline.service.ts execute(): build titlesBySchema +
docTypeBySchema, pass to attachSchemaMappings, stamp `docType: docTypeBySchema.get(schemaIri) ?? 'unknown'`.
Purely additive; extraction unchanged. tsc 0, jest unchanged. User reviewed & chose name heuristic.

## Task 1.7 — register providers in worker.module.ts — ✅ APPROVED
Added 6 imports + 6 providers (TopicClassifierService, 4 resolvers, ProjectKeyResolverChain) to the
always-on services block. ProjectMapperService ctor NOT changed (Phase 2). Abstract base NOT
registered. DI graph closes (chain→resolvers→DataSource+TopicClassifierService). tsc 0, jest unchanged.

## PHASE 1 COMPLETE
New files: topic-classifier.ts, document-type-classifier.ts, resolvers/{resolver.types,
circuit-breaker, base-resolver, dynamic-topic.resolver, cs-ref.resolver, relationships.resolver,
project-schema.resolver, resolver-chain.service}. Modified (additive): worker.module.ts,
policy-pipeline.service.ts, policy-pipeline.types.ts, project-mapper/types.ts.
Gate at phase end: tsc exit 0; jest 5 failed / 46 passed (== baseline, no regression).
No behaviour change — chain is registered but not yet called. Next: Phase 2 (R6) wires it in.

## Task 2.1 — wire chain into project-mapper.service.ts — ✅ APPROVED
10 edits: import ProjectKeyResolverChain + PolicyMapping; module-scope DATE_ONLY_FIELD_KEYS;
ctor gains resolverChain; local policyMapping typed `as PolicyMapping`; inline if/else resolution
block (72 lines) → `resolverChain.resolve(ctx)` + null-skip; vcDocType/isDateOnlySource before
extraction loop; two loop guards (validationReport break, date-only continue); ER_y skipped for
validationReport; `via=${method}` in debug; new `docTypeForSchema()`. Upsert INSERT + orphan DELETE
byte-for-byte unchanged (verified via diff). Behaviour changes intentional (M1 topic-keying; M3
gated by confirmProjectKey). tsc 0, jest baseline. isDateOnlySource def → DECISIONS D6.

## Task 2.2 — delete migrated helpers — ✅ APPROVED
Removed 7 now-unused private members (resolveProjectKeyViaRef, resolveProjectKeyViaRelationships,
isCsIdReferencedByOtherVcs, isCsIdOnProjectSchema, findCanonicalProjectSchemaCsIdInTopic,
isDownstreamTopic, DOWNSTREAM_TOPIC_NAMES) + JSDoc. Fixed 1 stale comment naming the deleted method
in the orphan-cleanup block (DELETE statement untouched). Cumulative service diff: +47/-350.
grep confirms 0 remaining references. Upsert INSERT + orphan DELETE intact. tsc 0, jest baseline.
PHASE 2 COMPLETE — chain now drives projectKey end-to-end.

## Phase 3 — data alignment (R8–R12) — ✅ ALL APPROVED
- 3.1 mint-project-linker.ts (R9): added `linkedVcs @>` containment arm to BOTH joins (Step 1 CTE
  on consensusTimestamp; Step 1.5 on csId) so topic-keyed projects link. tsc 0, jest baseline.
- 3.2 pg-project.repository.ts findActivity (R10): fetch businessData; count PROJECT rows on topic;
  shared topic (>1) → timeline from this project's linkedVcs[].consensusTimestamp via ANY(); single
  topic → original full-topic LIMIT 100 scan verbatim. tsc 0, jest baseline.
- 3.3 R11 (2 files): sync-scheduler schedulePolicyDecodeJobs SELECT alias + NOT EXISTS now use
  `COALESCE(NULLIF(m.options->>'topicId',''), m."topicId")`; business-view-builder businessData
  'topicId' same. tsc 0, jest baseline.
- 3.4 sync-scheduler rescheduleOrphanedTopics (R12): new method called after schedulePolicyDecodeJobs
  in onModuleInit; finds Topic.childId / Instance-Policy.instanceTopicId refs not in topic_cache,
  re-enqueues `topic-{id}-0` (remove-then-add). tsc 0, jest baseline.
- 3.5 schema-bootstrap.ts (R8): appended GIN index idx_business_view_linked_vcs on
  ("businessData"->'linkedVcs') WHERE viewType='PROJECT'. tsc 0, jest baseline.
PHASE 3 COMPLETE. Full changeset: 10 modified + 11 new files (resolvers/9, topic-classifier,
document-type-classifier). Gate: tsc 0, jest 46 passed/5 failed (frozen baseline).
NOTE: all Phase 1–3 correctness is static-verified only (tsc + diff review); no DB/worker run here.

## Phase 4 — unit tests (R13) — ✅ ALL APPROVED
- 4.1: `test/unit/worker/project-mapper/resolvers/circuit-breaker.spec.ts` (5),
  `.../resolvers/resolver-chain.spec.ts` (4), `test/unit/worker/project-mapper/topic-classifier.spec.ts`
  (4). Uses `@worker/*` alias imports (jest moduleNameMapper). Deviation: `afterEach(() => { jest.restoreAllMocks(); })`
  with braces — arrow-returning-jest-namespace fails @types/jest@30 void check. Endorsed.
- 4.2: `.../resolvers/dynamic-topic.resolver.spec.ts` (3), `.../resolvers/project-schema.resolver.spec.ts` (3).
  Mock TopicClassifierService / DataSource via `as unknown as` (standard test casts).
Jest now: **65 passed / 5 failed / 70 total** (5 failures = the 3 pre-existing broken suites, untouched).
tsc 0. Only test files added. PHASE 4 COMPLETE.

## Phase 5 — frontend Pipeline + Trust Chain (+ backend exposure) — ✅ ALL DONE
Decisions D7–D10 (real endpoint/field names; reuse stamped docType; implement 5.1 fully; nuxi typecheck gate).
- 5.0 BACKEND (tsc0/jest65): PolicySchemaRow.docType; findById builds docTypeByIri from policyMapping
  (reuses Phase 1 stamped docType, no re-classify); LinkedSchemaDto.docType + fromRow; ActivityEventDto.schemaName.
- 5.1 FE: types/models LinkedSchema.docType; useProjects mapApiProject docType + ActivityEvent.schemaName + mapActivityEvent.
- 5.2 RawVcDrawer.vue — right slide-over, fetches `/projects/:id/linked-vcs/:ts` (PLURAL), renders cs[0]
  as human-readable trust-chain panel (issuer DID, key-values, HashScan link). Teleport drawer.
- 5.3 ProjectPipeline.vue — vertical timeline from linkedSchemas, ordered by docType
  (registration→pdd→validation→monitoring(s)→verification→unknown last), each VC a step, ⓘ→RawVcDrawer.
- 5.4 [id].vue — added 'pipeline' to TabKey/VALID_TABS, tab button (Activity icon), v-else-if panel.
FE typecheck (`npx nuxi typecheck`): error set IDENTICAL to frozen baseline (FilterBar×2, useProjects:173
TS2321×2 [was :172, shifted by additive edit], methodologies/[id]×7, status.vue×1). New .vue files = 0 errors.
PHASE 5 COMPLETE. ALL PHASES (1–5) COMPLETE.

## Phase 6 — Pipeline step-map + decodeMethod badge (Tasks 6.1–6.4) — ✅ COMPLETE

### Files changed
- `src/worker/services/project-mapper.service.ts` — added `newFields.decodeMethod = resolvedProject.method;` after `newFields.status = 'Issuing'`. Upsert SQL untouched.
- `src/api/dto/project.dto.ts` — added `decodeMethod: string | null` @ApiProperty field alongside vcCount; added `decodeMethod` in fromRow return object.
- `frontend/types/models.ts` — added `decodeMethod?: string | null` to Project interface.
- `frontend/composables/useProjects.ts` — added `decodeMethod: typeof raw.decodeMethod === 'string' ? raw.decodeMethod : null` in mapApiProject return object.
- `frontend/components/project/ProjectTrustChain.vue` — CREATED: verbatim copy of old ProjectPipeline.vue (flat VC trust-chain timeline).
- `frontend/components/project/ProjectPipeline.vue` — REWRITTEN: one card per schema (step-map), decode-method badge at top, data-present indicator with CheckCircle2/Circle, ⓘ→RawVcDrawer on latest VC per schema.
- `frontend/pages/projects/[id].vue` — removed Activity Log card + Methodology Workflow card from Advanced tab; inserted `<ProjectTrustChain :project="project" />`; removed `useProjectActivity`/`activityEvents`/`activityLog`/`activityTypeIcon`/`methodologySteps` symbols; removed unused lucide icons (Clock, CheckCircle2, Circle, Zap). `fullMethodologyName` kept (still used by Methodology Field Mapping block at lines 1023/1025). Pipeline tab unchanged (auto-updated via component rewrite).

### Verification
- TSC_EXIT:0 (backend tsc --noEmit -p tsconfig.json)
- Jest: Tests: 5 failed, 65 passed, 70 total — matches frozen baseline
- Frontend nuxi typecheck: exit 2 with exactly the frozen baseline errors (FilterBar.vue×2, useProjects.ts:174 TS2321×2, methodologies/[id].vue×7, status.vue×1). Zero new errors introduced.

## Phase 7 — Policy Flowchart Canvas (Tasks 7.1–7.3) — ✅ COMPLETE

### Dependency added
- `@vue-flow/core@1.48.2` installed via `yarn add` in `frontend/`.
- `build.transpile` fix NOT needed — `.client.vue` suffix prevents SSR touching vue-flow; build passed without it.

### Files changed
- `frontend/components/project/ProjectPolicyCanvas.client.vue` — CREATED. `.client.vue` suffix for DOM-bound vue-flow. Imports VueFlow + Node/Edge types, `@vue-flow/core/dist/style.css` + `theme-default.css`. Custom `#node-step` slot renders a 220px card per schema: docType icon+label, schemaName, project-schema chip, VC availability row (CheckCircle2 / Circle), ⓘ button with `@mousedown.stop @click.stop` → RawVcDrawer. Nodes grouped by DOC_TYPE_RANK into columns (x = colIdx × 260, y = rowIdx × 140). Fan-out edges link every node in column i to every node in column i+1. `decodeMeta` computed with decode badge in header. Empty state when no linkedSchemas. Fixed-height container `h-[440px]`.
- `frontend/components/project/ProjectPipeline.vue` — removed `decodeMeta` computed (interface + switch block) and the badge `<span>` from the header template. Step-map list and all other markup preserved.
- `frontend/pages/projects/[id].vue` — Pipeline tab panel changed from `class="p-6"` to `class="p-6 space-y-6"`, `<ClientOnly><ProjectPolicyCanvas :project="project" /></ClientOnly>` added above `<ProjectPipeline>`.

### Verification
- @vue-flow/core version: 1.48.2 (yarn)
- `build.transpile` needed: NO
- `npx nuxi typecheck`: exit 2 with exactly the frozen baseline errors (FilterBar.vue×2, useProjects.ts TS2321×2, methodologies/[id].vue×7, status.vue×1). Zero new errors.
- `npx nuxi build`: PASS — client built in ~46s, server built in ~9s, no SSR/transpile errors.
- Backend `tsc --noEmit -p tsconfig.json`: EXIT 0
- Backend `jest`: Tests: 5 failed, 65 passed, 70 total — matches frozen baseline exactly. No backend files touched.

## Phase 8 — Schema labels in RawVcDrawer (Tasks 8.1–8.2) — ✅ COMPLETE

### Files changed
- `src/api/services/mapping-reprocess.service.ts` — additive: new private method `buildVcFieldLabels(ds, consensusTimestamp, document)` (extracts bareUuid from cs[0].type, joins message→policy on policyId WHERE decodeStatus='decoded', iterates schemaFields entries matching bareUuid, returns path→(description||title) map; wrapped in try/catch → returns {} on any error); new public method `getLinkedVcEvidence(network, projectId, consensusTimestamp)` (calls existing `getLinkedVcDocument`, then `buildVcFieldLabels`; returns `{ document, fieldLabels }`). getLinkedVcDocument unchanged.
- `src/api/services/project.service.ts` — additive: passthrough `getLinkedVcEvidence(network, projectId, consensusTimestamp)` delegating to `mappingReprocessService.getLinkedVcEvidence`. getLinkedVcDocument passthrough unchanged.
- `src/api/controllers/project.controller.ts` — additive: new route `@Get(':id/vc-evidence/:consensusTimestamp')` with `@ApiOperation`, `@ApiParam` ×3, `@ApiResponse` ×2 mirroring linked-vcs handler style. Calls `projectsService.getLinkedVcEvidence`. Existing linked-vcs route and all other routes unchanged.
- `frontend/components/project/RawVcDrawer.vue` — added `fieldLabels = ref<Record<string,string>>({})`. `load()` now fetches `/vc-evidence/${props.consensusTimestamp}` (was `/linked-vcs/`), sets `vcDoc.value = res.document ?? null` + `fieldLabels.value = res.fieldLabels ?? {}`, resets `fieldLabels.value = {}` at start. `fields` computed uses `fieldLabels.value[key] || humanizeKey(key)` as label. No other consumers of /linked-vcs touched (RelationshipDiagram, [id].vue remain on /linked-vcs).

### Verification
- TSC_EXIT: 0
- Jest: Tests: 5 failed, 65 passed, 70 total — frozen baseline exactly
- Frontend nuxi typecheck: exit 2 with exactly the frozen baseline errors (methodologies/[id].vue×7, status.vue×1). Zero new errors from RawVcDrawer.vue.
- curl `http://localhost:3030/api/v1/mainnet/projects/1759413394.156986243/vc-evidence/1759413394.156986243`: response shape `{ "document": {...}, "fieldLabels": {...} }` confirmed. fieldLabels has entries e.g. `"projectDescription":"Project Description"`. 2139 entries total (covers all schemas in the policy).
- /linked-vcs route: HTTP 200 confirmed still working. No changes to RelationshipDiagram or [id].vue.

## Phase 10B — IssuancesTable per-mint-event history (frontend) — ✅ COMPLETE

### Files changed
- `frontend/types/models.ts` — added `IssuanceEvent` interface (8 fields matching backend DTO); added `issuanceEvents?: IssuanceEvent[]` to `Project` interface (next to `issuances`).
- `frontend/composables/useProjects.ts` — import `IssuanceEvent`; in `mapApiProject` added `issuanceEvents` mapping after `issuances` (Array.isArray guard; per-field typeof guards for string/number/object; defaults [] / null).
- `frontend/components/project/IssuancesTable.vue` — reworked: primary path renders one row per `issuanceEvent` (Date/Token/Amount/Raw Data columns); per-token totals strip (border-t, px-5 py-2.5, text-xs muted) below history table; fallback v-else-if renders original per-token table verbatim when only `issuances` exist; empty state unchanged. Badge count shows events.length when events present, else linkedCredits.length. `makeEventCredit()` builds Credit-shaped payload with rawVc directly on it. linkMethod NOT shown in UI. Added no new imports.
- `frontend/pages/projects/[id].vue` — `handleViewVc` now uses `issuance?.rawVc ?? c.rawVc ?? null` so event Credits (which carry rawVc on the payload) display correctly.

### Verification
- `npx nuxi typecheck`: exit 2 with exactly the frozen baseline errors (FilterBar.vue TS1117×2, useProjects.ts TS2321×2 at ~line 262, methodologies/[id].vue TS7053×5, credits/index.vue TS2339, projects/index.vue TS2339, status.vue TS2345). ZERO new errors.
- view-vc emit contract preserved: still `(e: 'view-vc', payload: Credit): void`.
- Fallback per-token table: markup preserved verbatim in `v-else-if="linkedCredits.length > 0"` branch.

## Phase 10A — MintToken self-heal + M2 gate relax + issuance events API (Tasks 10.1–10.4, 10.6) — COMPLETE

### Files changed
- `src/worker/project-mapper/mint-project-linker.ts` — (10.1) candidate query NOT EXISTS now JOINs business_view to also pick up mints whose project_key no longer matches any PROJECT row (stale links self-heal on each run). Doc comment updated. (10.3) Added Step 1.75 (ref_root) between Step 1.5 and Step 2: recursive CTE walk of relationship ancestors; matches a PROJECT row where projectKey = ancestor cs.id OR cs.ref; linkMethod='ref_root', counter refRoot added. Final log line includes refRoot count.
- `src/worker/project-mapper/resolvers/cs-ref.resolver.ts` — (10.2) M2 gate now also accepts a resolved root that is an already-known PROJECT row (isKnownProjectRow check added after onProjectSchema fails). Reject message updated. Comment explains ELV/registration-doc anchor case and order-dependence.
- `src/api/repositories/project.repository.ts` — (10.4a/c) Added IssuanceEventRow interface; added issuanceEvents?: IssuanceEventRow[] to ProjectRow.
- `src/api/repositories/pg-project.repository.ts` — (10.4a) mintTokenRows query SELECTs pml.mint_consensus_timestamp AS mint_ts, pml.link_method. (10.4b) issuanceEvents array built from mintTokenRows after metaMap is available. (10.4c) mapRow accepts + returns issuanceEvents (default []).
- `src/api/dto/project.dto.ts` — (10.4d) New IssuanceEventDto class with @ApiProperty on all 8 fields + static fromRow. issuanceEvents: IssuanceEventDto[] added to ProjectResponseDto with @ApiProperty. Mapped in fromRow via IssuanceEventDto.fromRow.
- `test/unit/worker/project-mapper/resolvers/cs-ref.resolver.spec.ts` — (10.6) New spec: 4 tests (pass with no csRef; classified + on-schema resolves; classified + NOT on schema but IS known PROJECT row resolves; classified + neither rejects).

### Verification
- `tsc --noEmit`: exit 0
- `jest`: Tests: 5 failed, 76 passed, 81 total (baseline was 72 passed / 5 failed; +4 from new cs-ref spec). All 5 failures are pre-existing frozen failures.
- Linker trigger/cadence: unchanged — still called from BusinessViewBuilderProcessor at end of view build.
- Per-token aggregation logic: untouched — issuanceEvents is built separately after the aggregation loop.