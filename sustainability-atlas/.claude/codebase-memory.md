# Codebase Memory — live module topology (update when files change)

Stack: NestJS 11 (worker + api), TypeORM 0.3 (Postgres), BullMQ (Redict), Nuxt 3 frontend.
TS strict, ts-jest. Path aliases `@worker/* @api/* @shared/*`. Git root is the parent
`guardian/` dir (paths show `sustainable-explorer/...`).

## Worker — project mapping subsystem
- `src/worker/services/project-mapper.service.ts` — per-VC upsert into `business_view`.
  Ctor: `(DataSource, ReverseGeoService)`. Resolves projectKey today via inline branches
  (csRef walk → isProjectSchemaVc → strict-skip → relationships walk). Holds the big
  INSERT…ON CONFLICT upsert + orphan-cleanup DELETE (must be preserved verbatim per prompt #8).
  Private graph helpers here will migrate to base-resolver in Phase 1 / be deleted in Phase 2.
- `src/worker/project-mapper/` — helpers.ts, improved-heuristic.mapper.ts, schema-classifier.ts
  (classifyProjectSchema / buildSchemaEntryImproved), non-project-credential.ts, project-fields.ts
  (PROJECT_EXTRACT_FIELDS / ProjectFieldKey), types.ts (FieldDef, SchemaEntry, ResolvedFieldPaths),
  mint-project-linker.ts.
  - `src/worker/project-mapper/resolvers/` (Phase 1, DONE): resolver.types.ts, circuit-breaker.ts
    (CircuitBreaker, plain class), base-resolver.ts (abstract BaseProjectKeyResolver), the four
    strategies (DynamicTopicResolver/CsRefResolver/RelationshipsResolver/ProjectSchemaResolver),
    resolver-chain.service.ts (ProjectKeyResolverChain). All registered in worker.module.ts.
  - `src/worker/project-mapper/topic-classifier.ts` (DONE) — TopicClassifierService (note: at
    project-mapper/ root per prompt, not in resolvers/).
  - `src/worker/project-mapper/document-type-classifier.ts` (DONE, created in 1.6 — was MISSING
    despite prompt claiming it existed; see DECISIONS.md D2/D5). `DocumentType` union lives in
    project-mapper/types.ts; `PolicyMappingEntry.docType?: string` added; stamped at decode time
    in policy-pipeline.service.ts.
  - STILL no `docTypeForSchema()` in project-mapper.service.ts despite R6 "Keep" list — must be
    ADDED in Phase 2 Task 2.1 (architect-memory OQ5).
- `src/worker/mapping/` — policy-pipeline.service.ts (decode-time stamping), policy-pipeline.types.ts
  (PolicyMapping, PolicyMappingEntry, FlattenedSchemaField), classify-schema-type.ts,
  flatten-schema-fields.ts, derive-project-meta.ts, mapping-pipeline.service.ts, mapping.module.ts.
- `src/worker/worker.module.ts` — DI registration (providers[]). New @Injectables go here.
- `src/worker/schedulers/sync-scheduler.service.ts` — onModuleInit scheduling (R11, R12 targets).
- `src/worker/processors/business-view-builder.processor.ts` — businessData build (R11 target).

## Shared / API / Frontend (touched in later phases)
- `src/shared/database/schema-bootstrap.ts` — raw index creation (R8 GIN index target).
- `src/api/repositories/pg-project.repository.ts` — findActivity/findById (R10 target).
- `frontend/pages/projects/[id].vue`, `frontend/components/project/`,
  `frontend/composables/useProjects.ts` — Phase 5 Pipeline tab.

## Tests
- `test/unit/**/*.spec.ts`, `@jest/globals`, no real DB. Only 3 spec files currently exist and
  ALL 3 suites are RED at baseline (see dev-memory.md). New tests land in Phase 4.