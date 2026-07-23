# Sustainable Explorer — Project Mapping & Trust Chain Pipeline Implementation

## Mission

Implement robust project-cycle mapping from Guardian Verifiable Credentials (VCs)
and a frontend "Project Pipeline & Trust Chain" view showing every document in a
project's lifecycle with raw VC inspection. This is a re-implementation of work
previously designed but reverted; the prompt captures every requirement precisely.

---

## Two-Agent System

### Agent 1 — Senior Software Architect (`opus` model)
Role: owns the design, task breakdown, and review gate. Reads the codebase before
assigning any task. Reviews EVERY diff the junior produces before it is considered
done. Maintains `//.claude/architect-memory.md` and `//.claude/DECISIONS.md`.
Never writes application code directly — only plans, assigns, and reviews.

Architect checklist before approving any junior deliverable:
- [ ] No unnecessary abstractions beyond the stated requirement
- [ ] No new dependencies not already in `package.json`
- [ ] All new NestJS services are `@Injectable()` and registered in `worker.module.ts`
- [ ] All SQL uses parameterized queries (no string interpolation)
- [ ] TypeScript compiles clean (`npx tsc --noEmit`)
- [ ] Existing tests still pass (`npx jest`)
- [ ] No existing behaviour changed unless explicitly required
- [ ] Memory files updated

### Agent 2 — Junior Developer (`sonnet` model)
Role: implements exactly what the architect specifies, in the exact files and
patterns the architect designates. Maintains `//.claude/dev-memory.md`. Must read
the relevant source files before editing. Must run `npx tsc --noEmit` and
`npx jest` after each task and report results to the architect before moving on.

---

## Codebase Context (read before planning anything)

### Stack
- **Worker** (`src/worker/`): NestJS + BullMQ. Syncs HCS topics, fetches IPFS,
  decodes policies, maps VCs to project rows.
- **API** (`src/api/`): NestJS REST. Reads from Postgres `business_view` table.
- **Frontend** (`frontend/`): Nuxt 3. Project detail page at
  `frontend/pages/projects/[id].vue`.
- **Shared** (`src/shared/`): entities, config, `message-parser.ts`.
- Infra: Postgres (TypeORM synchronize + `src/shared/database/schema-bootstrap.ts`
  for raw indexes), BullMQ via Redict.

### Key files to read first
```
src/worker/services/project-mapper.service.ts       ← entry point for VC → project
src/worker/project-mapper/                          ← helpers, types, non-project-credential
src/worker/mapping/policy-pipeline.types.ts         ← PolicyMapping, PolicyMappingEntry
src/worker/mapping/policy-pipeline.service.ts       ← stamps entries at decode time
src/worker/worker.module.ts                         ← DI registration
src/shared/database/schema-bootstrap.ts             ← raw index creation
src/api/repositories/pg-project.repository.ts       ← findActivity, findById
frontend/pages/projects/[id].vue                    ← project detail page
frontend/components/project/                        ← existing project components
frontend/composables/useProjects.ts                 ← useProjectActivity, mapActivityEvent
docs/guardian-topic-hierarchy.md                    ← Guardian HCS topic tree structure
```

### Guardian topic tree (critical for understanding M1)
```
Seed Topic
└── User Topic (one per registry)
    └── Policy Topic
        ├── Instance-Policy publish-policy message  ← methodology source
        └── Instance Policy Topic
            ├── VCs directly on instance topic (shared-topic policies)
            └── Dynamic Topic "Project"             ← ONE per project submission
                └── VCs: INF, PDD, MR, VR, Issuance
```

### Current project-mapper.service.ts state
**The primary (first) resolver MUST be the dynamic topic ID (M1).**
Guardian creates one Dynamic Topic per project submission. Every VC in that
project's lifecycle (INF, PDD, MR, VR, MintToken) is published on the same
dynamic topic, so `projectKey = topicId` structurally collapses the full cycle
into one row — this is the cleanest and most reliable identity.

The current service does NOT implement this. It resolves `projectKey` via:
1. `cs.ref` chain walk (`resolveProjectKeyViaRef`, 8 hops)  ← currently method 1
2. `options.relationships` BFS (`resolveProjectKeyViaRelationships`, 24 hops)
3. Project-schema designation (`isProjectSchemaVc`)

After this implementation the priority order becomes:
```
M1  Dynamic topic ID          — PRIMARY (new, must be first)
M2  cs.ref chain              — secondary (existing, promoted to slot 2)
M3  Gated relationships BFS  — fallback (existing but made safe)
M4  Project-schema last resort — discard non-project VCs in classified policies
```

The resolver chain, circuit breaker, docType field guard, and
`TopicClassifierService` need to be built from scratch (the
`src/worker/project-mapper/resolvers/` folder does not exist yet).

### `PolicyMappingEntry` (already has `docType?: string` field)
```typescript
// src/worker/mapping/policy-pipeline.types.ts
export interface PolicyMappingEntry {
    source: 'schema' | 'policyJson';
    schemaIri?: string;
    schemaType?: PolicyMappingSchemaType;
    fieldPath?: string;
    isProjectSchema?: boolean;
    docType?: string;   // ← exists but is NOT stamped yet
    title: string;
    description: string;
    score?: number;
}
```
`src/worker/project-mapper/document-type-classifier.ts` exists and is correct;
it is NOT wired into `policy-pipeline.service.ts` yet.

---

## Part 1 — Backend: Project-Key Resolution

### Requirement summary
Collapse every VC in a project's lifecycle (INF, PDD, Validation, Monitoring x N,
Verification, MintToken) into **one** `business_view` PROJECT row, keyed by a
stable `projectKey`. Prevent INF and PDD appearing as two separate projects.

**`projectKey` priority (M1 is primary — this is non-negotiable):**
```
M1  Dynamic Topic ID   projectKey = topicId of the per-project dynamic topic
                       Every VC published on that topic maps to the same key.
                       This is the cleanest dedup — one topic = one project.

M2  cs.ref chain       projectKey = root cs.id reached by following cs.ref hops.
                       Applies to VCs on shared instance topics carrying cs.ref.

M3  Gated BFS          projectKey = confirmed ancestor cs.id via relationships.
                       Only accepted when confirmProjectKey() independently
                       verifies the ancestor (M1/M4/known row). Prevents VVB
                       mis-attribution.

M4  Project schema     projectKey = own cs.id  (project-schema VCs only).
                       Non-project-schema VCs in classified policies are REJECTED
                       (no row seeded) — this is the "discard the rest" rule.
```

All resolvers share a common interface and base class. A per-strategy circuit
breaker bounds blast radius when a single strategy's query misbehaves.

---

### R1 — Common resolver interface and base class

**Files to create:**
- `src/worker/project-mapper/resolvers/resolver.types.ts`
- `src/worker/project-mapper/resolvers/circuit-breaker.ts`
- `src/worker/project-mapper/resolvers/base-resolver.ts`

#### `resolver.types.ts`
```typescript
import { PolicyMapping } from '../../mapping/policy-pipeline.types';

export interface ResolutionContext {
    consensusTimestamp: string;
    topicId: string;
    csId: string;           // credentialSubject[0].id — always present (callers guard)
    csRef: string;          // credentialSubject[0].ref, trimmed, '' when absent
    isProjectSchemaVc: boolean;
    policyHasProjectSchemaClassification: boolean;
    policyMapping: PolicyMapping;
}

export type ResolutionOutcome =
    | { status: 'resolved'; projectKey: string; method: string }
    | { status: 'pass' }
    | { status: 'reject'; reason: string };

export interface ResolvedProjectKey {
    projectKey: string;
    method: string;         // logged to debug output for observability
}
```

#### `circuit-breaker.ts`
Single-class circuit breaker with:
- `threshold` consecutive failures → circuit OPEN
- `cooldownMs` → HALF-OPEN (log it)
- Successful half-open probe → CLOSED (log it)
- Open state returns `fallback` immediately without calling `fn`
- Use `number | null` (not `0`) as the "closed" sentinel for `openedAt`

#### `base-resolver.ts`
Abstract `@Injectable()` class holding ALL shared DB graph helpers that strategies
reuse. Strategies extend it and implement only `resolve(ctx)`. Methods to include:
- `resolveViaRef(startTs, startCsId)` — 8-hop cs.ref chain walk
- `resolveViaRelationships(startTs, startCsId)` — 24-hop BFS with self-ref guard
- `isCsIdReferencedByOtherVcs(csId, selfTs)`
- `isCsIdOnProjectSchema(csId, policyMapping)` — returns `true` when no schemas
  are classified (permissive fallback)
- `isKnownProjectRow(projectKey)` — checks `business_view WHERE viewType='PROJECT'`
- `confirmProjectKey(csId, policyMapping)` — used by M3; returns confirmed key or
  null (checks: dynamic project topic → topic-keyed; project schema → cs.id-keyed;
  known PROJECT row → cs.id-keyed)
- `projectSchemaUuids(policyMapping)` — Set of designated project schema UUIDs

Constructor: `(dataSource: DataSource, topicClassifier: TopicClassifierService)`.
Each subclass passes these up via `super(dataSource, topicClassifier)`.

---

### R2 — Topic classifier service

**File:** `src/worker/project-mapper/topic-classifier.ts`

```typescript
export type TopicKind = 'dynamic-project' | 'instance' | 'other';
export interface TopicClassification {
    kind: TopicKind;
    name: string | null;
    instancePolicyTopicId: string | null;
}

@Injectable()
export class TopicClassifierService {
    // in-process Map cache keyed by topicId
    // Only cache definitive results (kind !== 'other' || instancePolicyTopicId !== null)
    // because 'other' with null instancePolicyTopicId can be a temporary miss
    // due to ingest ordering
    async classifyTopic(dataSource: DataSource, topicId: string): Promise<TopicClassification>
}
```

Classification logic:
1. Query `message WHERE type='Topic' AND topicId=$1 AND options->>'parentId' IS NOT NULL`
   to get `{ parentId, name }`.
2. Check if topicId itself is an instance-policy topic (Instance-Policy message
   references it) → kind `'instance'`.
3. If it has a parent AND `name` matches `/project/i` AND parent chain reaches an
   instance-policy topic → kind `'dynamic-project'`.
4. Otherwise → kind `'other'`.

---

### R3 — Four resolver strategies (M1 → M4)

Each is a small `@Injectable()` extending `BaseProjectKeyResolver`.

#### M1 — `dynamic-topic.resolver.ts`
`method = 'topic'`
- Call `topicClassifier.classifyTopic`. If `kind !== 'dynamic-project'` → `pass()`.
- If kind is `'dynamic-project'` → `resolved(topicId)`.
- **No over-merge guard.** Guardian creates one dynamic topic per project
  submission; multiple same-project registrations sharing that topic are the
  very thing this resolver is meant to collapse. Removing the guard is deliberate.

#### M2 — `cs-ref.resolver.ts`
`method = 'csRef'`
- If `ctx.csRef` is empty → `pass()`.
- Walk via `resolveViaRef`. For classified policies where this VC is not itself the
  project schema, verify the chain terminus is on a project schema →
  if not, `reject('cs.ref resolves to non-project-schema VC')`.

#### M3 — `relationships.resolver.ts`
`method = 'relationships'`
- If `ctx.isProjectSchemaVc` → `pass()` (project schema VCs ARE the root; M4 keys them).
- Walk via `resolveViaRelationships`. If nothing walked → `pass()`.
- Call `confirmProjectKey` on the candidate. If not confirmed → `pass()` (do NOT
  reject; ungated relationships walk can mis-key, so silently pass to M4).

#### M4 — `project-schema.resolver.ts`
`method = 'projectSchema'`
- If `ctx.isProjectSchemaVc` → `resolved(ctx.csId)`.
- Else if `policyHasProjectSchemaClassification` → `reject('not the project schema, no cs.ref/ancestor')`.
- Else → `pass()` (unclassified policy — let the chain end; VC is skipped).

---

### R4 — Resolver chain orchestrator

**File:** `src/worker/project-mapper/resolvers/resolver-chain.service.ts`

`@Injectable()` class. Constructor receives `(m1, m2, m3, m4)` as the four
strategy instances. Maintains one `CircuitBreaker` per strategy
(`threshold=5, cooldownMs=30_000`). `resolve(ctx)` runs M1→M4:
- First `resolved` → returns `ResolvedProjectKey`, short-circuits.
- `reject` → returns `null` (VC skipped), short-circuits.
- Strategy throws → breaker absorbs it as `pass`, logs the error, chain continues.
- All `pass` → returns `null`.

---

### R5 — Wire docType into the policy pipeline

**File:** `src/worker/mapping/policy-pipeline.service.ts`

In `execute()`:
1. After `flattenAll(schemas, schemaTypes)`, build `docTypeBySchema: Map<string, DocumentType>`
   by calling the existing `classifyDocumentType(schema.name, schema.id, fieldDefMap)`
   from `document-type-classifier.ts` for each schema.
2. Pass `docTypeBySchema` into `attachSchemaMappings()` and stamp each
   `PolicyMappingEntry.docType = docTypeBySchema.get(schemaIri) ?? 'unknown'`.

`DocumentType` union type must be exported from
`src/worker/project-mapper/types.ts`:
```typescript
export type DocumentType =
    | 'pdd' | 'monitoringReport' | 'validationReport'
    | 'verificationReport' | 'registration' | 'unknown';
```

---

### R6 — Rewrite `project-mapper.service.ts` to use the chain

Replace the existing multi-branch `projectKey` resolution block with a call to
`resolverChain.resolve(ctx)`. Key constraints:

```typescript
// Constructor: inject the chain instead of individual helpers
constructor(
    private readonly dataSource: DataSource,
    private readonly reverseGeoService: ReverseGeoService,
    private readonly resolverChain: ProjectKeyResolverChain,
) {}
```

**docType field guard** — add this constant at module scope (not inside the class):
```typescript
const DATE_ONLY_FIELD_KEYS = new Set<string>([
    'vintageRaw', 'creditingPeriod', 'creditingPeriodStart', 'creditingPeriodEnd',
]);
```

In the extraction loop, before reading each field:
```typescript
if (vcDocType === 'validationReport') break;                          // contributes nothing
if (isDateOnlySource && !DATE_ONLY_FIELD_KEYS.has(field.key)) continue; // only dates/credits
```

**Credit guard**: validation reports also skip `ER_y` credit extraction.

**Debug log**: include `via=${resolvedProject.method}` in the final debug line.

**Remove** all private methods that moved into `BaseProjectKeyResolver`:
`resolveProjectKeyViaRef`, `resolveProjectKeyViaRelationships`,
`isCsIdReferencedByOtherVcs`, `isCsIdOnProjectSchema`,
`findCanonicalProjectSchemaCsIdInTopic`, `isDownstreamTopic`, and the
`DOWNSTREAM_TOPIC_NAMES` static set.

**Keep**: `docTypeForSchema()`, `queryPolicyByPolicyId()`,
`findPolicyVersionByTopicWalk()`, the orphan-cleanup DELETE, the full upsert SQL.

---

### R7 — Register all new services in `worker.module.ts`

Add to `providers[]`:
```typescript
TopicClassifierService,
DynamicTopicResolver,
CsRefResolver,
RelationshipsResolver,
ProjectSchemaResolver,
ProjectKeyResolverChain,
```
`ProjectMapperService` already present — just update its injected dependencies
by adding `ProjectKeyResolverChain` to its constructor parameters.

---

### R8 — GIN index for `linkedVcs` containment queries

**File:** `src/shared/database/schema-bootstrap.ts`

Add at the end of `bootstrapSchema()`:
```sql
CREATE INDEX IF NOT EXISTS idx_business_view_linked_vcs
ON business_view USING GIN (("businessData" -> 'linkedVcs'))
WHERE "viewType" = 'PROJECT'
```
This backs the `@>` containment lookups in `mint-project-linker.ts` and
`findActivity`.

---

### R9 — Fix `mint-project-linker.ts` for topic-keyed projects

When `projectKey = topicId` (M1), the existing Step 1.5 cs.ref join
(`bv."projectKey" = cs.ref`) fails because `cs.ref` is a DID, never a topic ID.
Fix Step 1.5 to also match against `linkedVcs[].csId`:
```sql
bv."projectKey" = m.documents->'credentialSubject'->0->>'ref'
OR bv."businessData"->'linkedVcs' @>
   jsonb_build_array(jsonb_build_object('csId',
       m.documents->'credentialSubject'->0->>'ref'))
```
Also fix Step 1 (recursive CTE): add the `linkedVcs` containment arm alongside
`bv."sourceTimestamp" = rc.ts` so chain timestamps match topic-keyed project rows.

---

### R10 — `findActivity` scoped to project's own VCs for shared topics

**File:** `src/api/repositories/pg-project.repository.ts`

Current `findActivity` scans all VCs on `relatedTopicId`, which over-lists when
multiple projects share one instance topic. Fix:
1. Count `business_view WHERE viewType='PROJECT' AND relatedTopicId=$topicId`.
2. If count > 1 (shared topic): source the timeline from
   `businessData.linkedVcs[].consensusTimestamp` — only fetch those specific
   messages by timestamp from `message` table.
3. If count = 1 (per-project dynamic topic): keep the existing full-topic scan.

---

### R11 — `schedulePolicyDecodeJobs` & `businessData.topicId` correct topic source

**File:** `src/worker/schedulers/sync-scheduler.service.ts`

In `schedulePolicyDecodeJobs()`, the `Instance-Policy publish-policy` message can
be published on the instance topic (not the policy topic). `m."topicId"` would
then be the instance topic. Always prefer the message content's `options.topicId`:
```sql
COALESCE(NULLIF(m.options->>'topicId', ''), m."topicId") AS policy_topic_id
```
Apply the same fix in the NOT EXISTS subquery that checks for an existing decoded
policy row.

**File:** `src/worker/processors/business-view-builder.processor.ts`

Same fix for `businessData.topicId`:
```sql
'topicId', COALESCE(NULLIF(m.options->>'topicId', ''), m."topicId"),
```

---

### R12 — Rescue orphaned topics on boot

**File:** `src/worker/schedulers/sync-scheduler.service.ts`

Add `rescheduleOrphanedTopics()` called from `onModuleInit()` after
`schedulePolicyDecodeJobs()`. It finds all topic IDs referenced in
`message.options.childId` (Topic messages) or `message.options.instanceTopicId`
(Instance-Policy messages) that are NOT in `topic_cache`, then re-enqueues
`topic-{id}-0` sync jobs for them (removing any stale failed job first).
This fixes the "only 7 methodologies after 3 hours" scenario where failed
topic-sync jobs silently leave entire policy subtrees unreachable.

---

### R13 — Unit tests

**Pattern**: follow `test/unit/worker/mapping/` conventions (Jest, `@jest/globals`,
no real DB). Write tests for:
- `CircuitBreaker`: open/close/half-open transitions, sentinel null bug (mock
  `Date.now()` to 0 to prove null sentinel is needed).
- `ProjectKeyResolverChain`: first-resolved wins; reject short-circuits; throw is
  absorbed as pass; all-pass returns null.
- `TopicClassifierService`: dynamic-project / instance / other classification;
  cache stores definitive results only.
- `DynamicTopicResolver` (M1): resolves by topicId; passes for instance topics.
- `ProjectSchemaResolver` (M4): keys project-schema VC; rejects non-schema VC in
  classified policy; passes in unclassified policy.

---

## Part 2 — Frontend: Project Pipeline & Trust Chain View

### Context
Current project detail page (`frontend/pages/projects/[id].vue`) has tabs:
Summary, Issuances, Documents (LinkedVcsPanel), Advanced. The activity log
is a simple timeline at the bottom of the Summary tab.

### Requirement
Add a **"Pipeline"** tab to the project detail page that shows the full
project lifecycle as a trust chain: every VC attributed to this project,
grouped by document type (INF / PDD → Validation → Monitoring × N →
Verification → Issuance), with:
1. A step-by-step pipeline visualization (vertical timeline or horizontal
   stages) with one card per document.
2. Multiple Monitoring Reports shown individually (not collapsed).
3. Each card has a small **info icon (ⓘ)** that opens a drawer/modal showing
   the raw `credentialSubject[0]` JSON from the VC — styled as a "trust chain"
   evidence panel (timestamp, schema, DID, raw payload).
4. Raw VC data is fetched from the existing `/projects/:id/linked-vc/:ts`
   endpoint (already wired in `mapping-reprocess.service.ts`).

### Components to create/modify

#### New: `frontend/components/project/ProjectPipeline.vue`
Props: `project: Project` (existing type). Reads `project.schemas` (the
`linkedVcs` grouped by schema already returned by the API in
`ProjectResponseDto.fromRow`) to build the pipeline steps.

Step ordering — classify each schema's documents by `docType` (available on
each linked-vc entry via `schemaUuid` lookup against `schema.schemaName`):
```
registration / pdd  →  validationReport  →  monitoringReport(s)  →  verificationReport  →  credit/issuance
```
Unknown types appear at the end. Multiple monitoring reports are shown as
separate steps in sequence order (by `consensusTimestamp`).

Each step card shows:
- Icon matching doc type (Shield for validation, BarChart for monitoring, etc.)
- Schema name
- Consensus timestamp (formatted)
- Hedera Hashscan link for the topic
- **ⓘ Raw VC button** → opens `RawVcDrawer`

#### New: `frontend/components/project/RawVcDrawer.vue`
- Prop: `consensusTimestamp: string`, `projectId: string`, `schemaName: string`
- On open, calls `GET /api/v1/{network}/projects/{projectId}/linked-vc/{ts}`
- Renders the JSON as a formatted trust-chain panel:
  - Header: schema name + timestamp + "On-chain evidence"
  - Issuer DID
  - `credentialSubject` fields rendered as key-value pairs (no raw JSON dump —
    read each field and render human-readable)
  - "View on Hashscan" link
- Uses existing `HederaReferences` styling conventions

#### Modify: `frontend/pages/projects/[id].vue`
Add `'pipeline'` to `TabKey` union. Add the Pipeline tab button and panel:
```html
<template v-if="activeTab === 'pipeline'">
    <ProjectPipeline :project="project" />
</template>
```
No other changes to existing tabs.

#### Modify: `frontend/composables/useProjects.ts`
The `ActivityEvent` interface needs `schemaName` surfaced (it's already returned
by the API but stripped in `mapActivityEvent`). Add `schemaName: string | null`
to `ActivityEvent` and pass it through from `raw.schemaName`.

---

## Implementation Order (architect assigns in this sequence)

```
Phase 1 — Resolver infrastructure (backend, no behaviour change)
  Task 1.1  Create resolver.types.ts, circuit-breaker.ts, base-resolver.ts
  Task 1.2  Create topic-classifier.ts
  Task 1.3  Create the four resolver strategies (M1–M4)
  Task 1.4  Create resolver-chain.service.ts
  Task 1.5  Wire docType into policy-pipeline.service.ts (R5)
  Task 1.6  Register all new providers in worker.module.ts (R7)

Phase 2 — Rewrite project-mapper.service.ts (R6)
  Task 2.1  Replace resolution block with chain call + docType guard
  Task 2.2  Remove migrated helpers; confirm tsc clean + tests pass

Phase 3 — Data alignment fixes
  Task 3.1  Fix mint-project-linker.ts (R9)
  Task 3.2  Fix findActivity in pg-project.repository.ts (R10)
  Task 3.3  Fix schedulePolicyDecodeJobs + businessData.topicId (R11)
  Task 3.4  Add rescheduleOrphanedTopics (R12)
  Task 3.5  Add GIN index in schema-bootstrap.ts (R8)

Phase 4 — Unit tests (R13)
  Task 4.1  circuit-breaker, resolver-chain, topic-classifier tests
  Task 4.2  M1 and M4 strategy tests

Phase 5 — Frontend Pipeline tab
  Task 5.1  Add schemaName to ActivityEvent composable
  Task 5.2  Create RawVcDrawer.vue
  Task 5.3  Create ProjectPipeline.vue
  Task 5.4  Add Pipeline tab to [id].vue
```

---

## Memory files both agents must maintain

```
.claude/architect-memory.md    — design decisions, open questions, phase status
.claude/dev-memory.md          — files changed, tsc status, test status, blockers
.claude/DECISIONS.md           — any deviations from this prompt, with rationale
.claude/codebase-memory.md     — live summary of module topology (update when files change)
```

---

## Hard constraints

1. **No new npm packages** — use only what is in the existing `package.json`.
2. **No `any` casts** beyond what already exists in the file being edited.
3. **No `// TODO` left in delivered code** — every task must be complete.
4. **No backwards-compat shims** — if a method moved to the base class, delete
   it from the service; do not alias or re-export it.
5. **All SQL parameterized** — `dataSource.query(sql, [params])` only.
6. **NestJS DI** — every `@Injectable()` class must appear in `worker.module.ts`
   providers before it can be injected anywhere.
7. **Run tsc + jest after every task** — junior reports results; architect must
   see "TSC_EXIT:0" and green test count before approving the next task.
8. **The existing upsert SQL** in `project-mapper.service.ts` (the large
   `INSERT INTO business_view … ON CONFLICT` block with the COALESCE merge
   strategy, `_fromProjectSchema` priority, `linkedVcs` dedup, and orphan-cleanup
   DELETE) must be preserved exactly — do not rewrite it.
