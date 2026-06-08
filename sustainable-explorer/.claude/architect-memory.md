# Architect Memory — Sustainable Explorer Mapping & Trust-Chain Pipeline

Role: Senior Software Architect (opus). Plans + reviews only; never writes app code.
Junior implementer: Sonnet subagents spawned one task at a time.
Gate after every task: `npx tsc --noEmit` (expect `TSC_EXIT:0`) + `npx jest` (green) +
the AGENT-PROMPT review checklist.

## Status board

| Phase | Task | Description | State |
|-------|------|-------------|-------|
| 1 | 1.1 | resolver.types.ts + circuit-breaker.ts | ✅ DONE (approved) |
| 1 | 1.2 | topic-classifier.ts (R2) — pulled earlier | ✅ DONE (approved) |
| 1 | 1.3 | base-resolver.ts (R1) | ✅ DONE (approved) |
| 1 | 1.4 | four resolver strategies M1–M4 (R3) | ✅ DONE (approved) |
| 1 | 1.5 | resolver-chain.service.ts (R4) | ✅ DONE (approved) |
| 1 | 1.6 | document-type-classifier.ts + docType field + wire (R5) | ✅ DONE (approved; user-endorsed, D5) |
| 1 | 1.7 | register providers in worker.module.ts (R7, providers only) | ✅ DONE (approved) |
| 1 | — | **PHASE 1 COMPLETE** — resolver infra in place, no behaviour change | ✅ |
| 2 | 2.1 | rewrite project-mapper.service.ts to call chain + docType guard (R6) | ✅ DONE (approved) |
| 2 | 2.2 | delete migrated helpers; tsc+jest green | ✅ DONE (approved) |
| 2 | — | **PHASE 2 COMPLETE** — chain drives projectKey; upsert SQL preserved verbatim | ✅ |
| 3 | 3.1 | mint-project-linker.ts (R9) | ✅ DONE (approved) |
| 3 | 3.2 | findActivity scoping (R10) | ✅ DONE (approved) |
| 3 | 3.3 | schedulePolicyDecodeJobs + businessData.topicId (R11) | ✅ DONE (approved) |
| 3 | 3.4 | rescheduleOrphanedTopics (R12) | ✅ DONE (approved) |
| 3 | 3.5 | GIN index in schema-bootstrap.ts (R8) | ✅ DONE (approved) |
| 3 | — | **PHASE 3 COMPLETE** — data-alignment fixes (topic-keyed joins, scoping, topic source, orphan rescue, GIN index) | ✅ |
| 4 | 4.1 | circuit-breaker / resolver-chain / topic-classifier tests | ✅ DONE (approved, +13 tests) |
| 4 | 4.2 | M1 + M4 strategy tests | ✅ DONE (approved, +6 tests) |
| 4 | — | **PHASE 4 COMPLETE** — +19 passing tests (jest now 65 passed / 5 failed) | ✅ |
| 5 | 5.0 | BACKEND: docType on linkedSchemas (reuse stamped) + schemaName on ActivityEventDto (D8/D9) | ✅ DONE (approved) |
| 5 | 5.1 | FE: docType+schemaName on types/models + useProjects composables | ✅ DONE (approved) |
| 5 | 5.2 | RawVcDrawer.vue (REAL /linked-vcs/:ts, D7) | ✅ DONE (typecheck-clean) |
| 5 | 5.3 | ProjectPipeline.vue (orders by docType, reads linkedSchemas) | ✅ DONE (typecheck-clean) |
| 5 | 5.4 | Pipeline tab in [id].vue | ✅ DONE (typecheck-clean) |
| 5 | — | **PHASE 5 COMPLETE** — nuxi typecheck error set == baseline (no new errors); new .vue files clean | ✅ |
| — | — | **ALL PHASES COMPLETE (1–5).** Backend tsc 0 / jest 65p·5f(frozen). FE typecheck == baseline. | ✅ |

**Frontend typecheck baseline (`npx nuxi typecheck`, captured pre-change) — NOT CLEAN (exit 2):**
~12 pre-existing errors, FROZEN (gate = no NEW errors beyond these):
- `components/shared/FilterBar.vue` 410,33 + 424,33 — TS1117 duplicate object props (×2)
- `composables/useProjects.ts` 172,15 — TS2321 excessive stack depth (Nuxt route-type recursion) (×2)
  — I edit this file for 5.1 but at lines ~187/~195 (ActivityEvent + mapActivityEvent), NOT line 172.
- `pages/methodologies/[id].vue` 315/334/1146/1148/1149/1152/1155 — TS7053 ResolvedFieldKey index (×7)
- `pages/status.vue` 763,18 — TS2345 onClick type
New `.vue` files (RawVcDrawer, ProjectPipeline) must be type-clean; edits must not add errors.
NOTE: nuxi typecheck is slow (installs vue-tsc, runs nuxt prepare). Run at FE task checkpoints.

## Phase 1 plan & ordering rationale

Prompt lists Phase 1 as 1.1–1.6. I REORDERED for compile-safety (see DECISIONS.md D1):

1. **1.1** `resolver.types.ts` + `circuit-breaker.ts` — zero external deps, independently
   tsc-clean and unit-testable. Done first.
2. **1.2** `topic-classifier.ts` (R2) — pulled ahead of base-resolver because
   `base-resolver.ts` imports `TopicClassifierService` in its constructor and uses it in
   `confirmProjectKey()`. Building base-resolver first would fail tsc.
3. **1.3** `base-resolver.ts` (R1) — abstract `@Injectable()` base. Ports the graph-walk
   helpers from `project-mapper.service.ts` (resolveViaRef, resolveViaRelationships,
   isCsIdReferencedByOtherVcs, isCsIdOnProjectSchema) + adds new ones (isKnownProjectRow,
   confirmProjectKey, projectSchemaUuids, isCsIdOnProjectSchema permissive fallback).
   NOTE: methods are COPIED here in Phase 1; they are DELETED from the service in Phase 2
   Task 2.2. Temporary duplication is expected and acceptable (no behaviour change).
4. **1.4** four strategies M1–M4, each extends base, implements only `resolve(ctx)`.
5. **1.5** `resolver-chain.service.ts` — one CircuitBreaker per strategy (threshold=5,
   cooldownMs=30_000), runs M1→M4.
6. **1.6** R5 docType wiring — BLOCKED by missing files (see DECISIONS.md D2). Must FIRST
   create `document-type-classifier.ts` (classifyDocumentType + DocumentType union) and ADD
   `docType?` to PolicyMappingEntry, THEN wire into policy-pipeline.service.ts.
7. **1.7** register new providers in `worker.module.ts` providers[] ONLY. Do NOT change
   ProjectMapperService constructor yet — that happens in Phase 2 when its body uses the
   chain. Phase 1 stays a true no-behaviour-change refactor (new providers registered but
   not injected anywhere). NestJS tolerates unused providers; DI graph still resolves.

## Source-of-truth facts gathered from the codebase

- Stack confirmed: NestJS 11, TypeORM 0.3, BullMQ, ts-jest 29, TS 5.5. tsconfig: `strict`,
  `noImplicitAny`, `strictNullChecks`. NO `noUnusedLocals/Parameters` → unused ctor params OK.
- Path aliases: `@worker/*`, `@api/*`, `@shared/*` (tsconfig + jest moduleNameMapper).
- Tests: `test/**`, `*.spec.ts`, `@jest/globals` imports, no real DB. tsconfig EXCLUDES
  `test/` so `tsc --noEmit` covers `src/**` only; jest compiles tests via ts-jest.
- `project-mapper.service.ts` ctor today: `(dataSource: DataSource, reverseGeoService)`.
  Existing private methods to migrate: resolveProjectKeyViaRef (8 hops), isCsIdOnProjectSchema,
  isCsIdReferencedByOtherVcs, findCanonicalProjectSchemaCsIdInTopic, resolveProjectKeyVia
  Relationships (24-hop BFS, calls resolveProjectKeyViaRef internally), isDownstreamTopic +
  DOWNSTREAM_TOPIC_NAMES static set. KEEP: queryPolicyByPolicyId, findPolicyVersionByTopicWalk,
  the big upsert INSERT…ON CONFLICT, orphan-cleanup DELETE, module-level helpers.
- `PolicyMapping = Partial<Record<ProjectFieldKey|string, PolicyMappingEntry[]>>`.
  `PolicyMappingEntry` currently has source/schemaIri/schemaName/schemaType/fieldPath/
  isProjectSchema/policyJsonPath/title/description/score. NO docType field (prompt wrong).
- worker.module.ts: providers[] holds HederaService, IpfsService, ReverseGeoService,
  ProjectMapperService, POLICY_ZIP_STORAGE, processors, scheduler, autoscaler. This is where
  new @Injectables register.

## Baseline test status (captured before any change) — NOT GREEN

`npx tsc --noEmit` → **TSC_EXIT:0** (clean).
`npx jest` → **46 passed, 5 failed, 3 suites broken.** Pre-existing, unrelated to this work:
- `test/unit/message-parser.spec.ts:611` — `parsed.tokens` toEqual ['0.0.8001','0.0.8002'] fails.
- `test/unit/worker/mapping/map-fields.strategy.spec.ts:259` — TS2554, `execute()` called with
  3 args, signature now takes 2 (test stale vs mapping refactor).
- `test/unit/worker/mapping/map-schemas.strategy.spec.ts` — imports missing members
  (`IMapSchemasStrategy`, `map-schemas.provider`, `MapSchemasMethodType`) — test stale vs refactor.

**Gate redefinition:** prompt assumes a green baseline; it is not. Until/unless the user asks me
to fix these, the per-task gate is **TSC_EXIT:0 AND no failures beyond the 5 known-failing tests
in the 3 broken suites above.** All Phase 1–4 work is in resolver/project-mapper/test files that
do not touch these suites. FLAGGED to user.

## Open questions / risks

- **OQ1 (resolved → D2):** document-type-classifier.ts & PolicyMappingEntry.docType don't
  exist. Plan: create them in Task 1.6. DocumentType union per R5. classifyDocumentType
  signature `(schemaName, schemaId, fieldDefMap)` per R5 — design heuristic when we reach 1.6.
- **OQ2:** `confirmProjectKey` "known PROJECT row" check reads business_view — must use
  parameterized query + `viewType='PROJECT'`. Verify column is `projectKey` (it is, per upsert).
- **OQ3:** TopicClassifierService cache must store ONLY definitive results
  (kind!=='other' || instancePolicyTopicId!==null) to tolerate ingest-order misses.
- **OQ4:** Phase 2/3 SQL fixes (R9–R12) touch live query behaviour — review each diff against
  real column names before approving; cannot run the worker here, only tsc+jest.
- **OQ5 (Phase 2):** R6 "Keep" list names `docTypeForSchema()` as if it exists in
  project-mapper.service.ts — it does NOT (grep confirms only AGENT-PROMPT.md). It must be ADDED
  in Phase 2 Task 2.1: a method that reads the docType stamped on the VC's schema entries
  (from Task 1.6) to produce `vcDocType` for the extraction guard. Will add DECISIONS D5 then.

## Review checklist (apply before every approval)
No needless abstraction · no new deps · @Injectable + registered in worker.module ·
parameterized SQL only · tsc clean · jest green · no existing behaviour changed unless required ·
memory files updated.