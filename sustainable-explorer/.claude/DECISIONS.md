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