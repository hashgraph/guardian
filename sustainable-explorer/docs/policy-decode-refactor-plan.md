# Policy Decode Refactor — Implementation Plan

Single source of truth for the upcoming refactor of the policy decode subsystem
in `sustainable-explorer`. Supersedes the ad-hoc decisions currently spread
across `policy_decode_status` / `policy_schema` tables and
`policy-decode.processor.ts`.

---

## Goals

1. Collapse the two-table state model (`policy_decode_status`, `policy_schema`)
   into a single `policy` table that holds raw zip contents, mappings, and
   decode status per published policy version.
2. Persist downloaded policy zips to file storage so re-decodes don't re-hit
   IPFS.
3. Unify all extraction logic under one pipeline — no special-case
   "extract categories before pipeline" path. Policy-level fields (sectoral
   scopes, emission reduction approach) flow through the same field-mapping
   pipeline as project-instance fields.
4. Index `message.policyId` so VCs can be linked to their owning policy
   without walking the topic-parent chain.
5. Support two distinct re-run operations:
   - **Re-decode** — regenerate `policyMapping` (overwrites manual edits).
   - **Re-parse projects** — re-run extraction over existing VCs using the
     current `policyMapping` (manual edits preserved).

---

## Locked Decisions

| Topic | Decision |
|---|---|
| Existing data | Clean-slate DB reset. No backfill, no feature flag. |
| Retry semantics | `decoded` → skip. `pending` older than `IPFS_TIMEOUT * 10` → retry. `failed` with `attempts < MAX` → retry. `failed` with `attempts >= MAX` → skip + log. |
| `rawSchemaJson` shape | Single JSONB column, `{iri: schemaDoc}`. Accept size trade-off. |
| Re-decode (policy) | Regenerates `policyMapping` and `schemaFields`. **Overwrites** manual mapping edits. |
| Re-parse projects | Re-runs project extraction against current `policyMapping`. Manual edits honored. |
| File storage backend | **Local filesystem** for now, behind a `PolicyZipStorageService` interface so S3/MinIO can be added later without touching call sites. |
| Policy identity | `(policyId, version)`. Same `policyTopicId` may have multiple rows (one per version). |
| VC→policy linkage | `message.policyId` indexed column, populated post-IPFS-fetch from `credentialSubject[0].policyId`. **Phase 0** verifies this is unique per version. |
| Mapping shape | Grouped by `PROJECT_EXTRACT_FIELDS` name. |
| `isProjectSchema` | Priority hint inside `policyMapping`, not a hard filter. |
| MintToken VCs | Skip for project extraction. Used for **issuance** keyed by `tokenId`. |
| StandardRegistry VCs | Skip for project extraction. Used for **Registry** data extraction. |
| Other VCs | Used for project extraction normally. |
| Deferred VC IPFS fetch | **Keep** `enqueueVcIpfsFetchIfReady` as-is. |
| `EAGER_IPFS_TYPES` | Unchanged. `Instance-Policy` already removed → no double-fetch. |
| Category extraction | **Removed** as a separate stage. Sectoral scopes / emission reduction approach are produced by the same field pipeline (entries in `PROJECT_EXTRACT_FIELDS` with policy.json-sourced descriptors). When projects are persisted, these values are copied into the project's raw extracted data; the frontend reads them from there. |
| Stale-pending cleanup | No cron needed — retry guard handles it (`pending` older than `IPFS_TIMEOUT * 10` is eligible for retry by the next job pickup). |

---

## Phase 0 — Verify VC→policy-version linkage

**Goal:** Confirm `credentialSubject[0].policyId` differs across published
versions of the same policy. Determines whether `message.policyId` alone is
enough or we also need `message.policyVersion` / `message.policySourceCid`.

**Method:**
1. Use MECD-v1.2 (topic `0.0.10380341`, versions 0.1 / 0.2) as the test case.
2. Sample 5–10 VCs from each version (filter `message` by topic + relationship
   chain leading to each Instance-Policy CID).
3. Decode their IPFS payloads from `ipfs_files`.
4. Compare `credentialSubject[0].policyId` values across the two version
   cohorts.

**Decision tree:**
- All version-0.1 VCs share one policyId and all version-0.2 VCs share a
  different one → simple direct link. `message.policyId` only.
- Both versions share the same policyId → also persist `message.policyVersion`
  derived by walking relationships back to the nearest Instance-Policy.

Result is documented at the top of Phase 1 before writing the migration.

---

## Phase 1 — Schema Migration

Single migration, clean drop + create:

```sql
DROP TABLE IF EXISTS policy_decode_status CASCADE;
DROP TABLE IF EXISTS policy_schema CASCADE;

CREATE TABLE policy (
    id              BIGSERIAL PRIMARY KEY,
    "policyId"      VARCHAR(64)  NOT NULL,
    version         VARCHAR(32)  NOT NULL,
    "policyTopicId" VARCHAR(20)  NOT NULL,
    "sourceCid"     VARCHAR(100) NOT NULL,
    "rawPolicyJson" JSONB,
    "rawSchemaJson" JSONB,            -- { iri: schemaDoc }
    "rawTokensJson" JSONB,            -- { tokenId: tokenDoc }
    "rawTagsJson"   JSONB,
    "policyMapping" JSONB,            -- grouped by PROJECT_EXTRACT_FIELDS name
    "schemaFields"  JSONB,            -- flattened, system-owned
    "decodeStatus"  VARCHAR(16) NOT NULL DEFAULT 'pending',
    error           TEXT,
    attempts        INT NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMPTZ,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_policy_id_version UNIQUE ("policyId", version),
    CONSTRAINT uq_policy_source_cid UNIQUE ("sourceCid")
);

CREATE INDEX idx_policy_topic_id ON policy ("policyTopicId");
CREATE INDEX idx_policy_decode_status ON policy ("decodeStatus");

ALTER TABLE message ADD COLUMN "policyId" VARCHAR(64);
CREATE INDEX idx_message_policy_id ON message ("policyId");
```

If Phase 0 shows shared policyId across versions, also add:
```sql
ALTER TABLE message ADD COLUMN "policySourceCid" VARCHAR(100);
CREATE INDEX idx_message_policy_source_cid ON message ("policySourceCid");
```

---

## Phase 2 — File Storage Abstraction

**Files to create:**
- `src/worker/services/storage/policy-zip-storage.interface.ts`
- `src/worker/services/storage/local-policy-zip-storage.service.ts`

**Interface:**
```ts
export interface PolicyZipStorage {
    exists(cid: string): Promise<boolean>;
    read(cid: string): Promise<Buffer>;
    write(cid: string, buffer: Buffer): Promise<void>;
    delete(cid: string): Promise<void>;   // used by ?forceRedownload=true
}
```

**Local implementation:**
- Root path configured by env `POLICY_ZIP_STORAGE_PATH` (default
  `./data/policy-zips/`).
- File layout: `{root}/{cid}.zip`. CIDs are content-addressed so collisions
  are impossible.
- Atomic writes: write to `.tmp` then rename.
- Idempotent: re-writing an existing CID is a no-op.

**DI:** registered against the interface token so swapping to S3 later is a
provider change in the worker module.

---

## Phase 3 — Pipeline Rewrite

**Service:** `MappingPipelineService`

**New signature:**
```ts
interface PipelineInput {
    rawPolicyJson: Record<string, unknown>;
    rawSchemas:    Record<string, unknown>;   // {iri: schemaDoc}
    fieldDescriptors: FieldDescriptor[];      // from PROJECT_EXTRACT_FIELDS
}

interface PipelineOutput {
    policyMapping: PolicyMapping;             // grouped by extract field name
    schemaFields:  FlattenedSchemaField[];    // system-owned, never edited
}
```

**Stages:**
1. **Flatten schemas** → produce `schemaFields` (path, type, title,
   description, source schema iri). Includes nested fields recursively.
2. **Match field descriptors against schemaFields** — existing fuzzy /
   keyword logic.
3. **Match field descriptors against `rawPolicyJson`** — same descriptor
   shape, just sourced from policy.json (replaces `extractCategoriesFromZip`).
   Descriptors carry an optional `policyJsonPath` hint for known fields.
4. **Score boost** for schemas that look like the "project schema"
   (preserved heuristic from `derivePerPolicyProjectMeta`), but as a priority
   nudge — not a filter.
5. **Tag** mapping entries with their source schema type so consumers can
   skip MintToken / StandardRegistry when extracting projects.
6. **Assemble `policyMapping`**, grouped by extract field name:
```ts
type PolicyMapping = {
    [extractFieldName: string]: PolicyMappingEntry[];
};

interface PolicyMappingEntry {
    source: 'schema' | 'policyJson';
    schemaIri?: string;      // when source = 'schema'
    schemaType?: string;     // 'MintToken' | 'StandardRegistry' | other — consumer-side filter hint
    fieldPath?: string;
    policyJsonPath?: string; // when source = 'policyJson'
    title: string;
    description: string;
    isProjectSchema: boolean;
    score: number;
}
```

`PROJECT_EXTRACT_FIELDS` is extended to include the existing system-only
fields (`Sectoral Scope`, `Emission Reduction Approach`, etc.) with
`policyJsonPath` hints — no separate code path. The frontend already knows
the field list, so policy-level fields render the same way as project-level
ones.

---

## Phase 4 — Rewrite `policy-decode.processor.ts`

```
async runDecode(cid, policyTopicId) {
    1. row = SELECT * FROM policy WHERE sourceCid = cid;
       if row.decodeStatus === 'decoded'                            → skip, log
       if row.decodeStatus === 'pending'
            && age(lastAttemptAt) < IPFS_TIMEOUT * 10               → skip (race guard)
       if row.decodeStatus === 'failed' && attempts >= MAX_ATTEMPTS → skip, log
       (else fall through to step 2)

    2. UPSERT policy row:
         sourceCid, policyTopicId,
         decodeStatus='pending', attempts=attempts+1, lastAttemptAt=now()

    3. zip = storage.exists(cid)
            ? storage.read(cid)
            : await ipfs.fetchContent(cid).tap(b => storage.write(cid, b));

    4. parse zip:
         rawPolicyJson  = policy.json
         rawSchemaJson  = {iri → doc}  from schemas/
         rawTokensJson  = {tokenId → doc} from tokens/  (if any)
         rawTagsJson    = tags.json (if any)
         policyId       = rawPolicyJson.id
         version        = rawPolicyJson.version

    5. {policyMapping, schemaFields} = await pipeline.execute({
         rawPolicyJson, rawSchemas: rawSchemaJson,
         fieldDescriptors: PROJECT_EXTRACT_FIELDS,
       });

    6. UPDATE policy row:
         policyId, version,
         rawPolicyJson, rawSchemaJson, rawTokensJson, rawTagsJson,
         policyMapping, schemaFields,
         decodeStatus='decoded', error=null, updatedAt=now();

    7. backfillDeferredVcFetches(policyTopicId);   // unchanged, still needed
}
```

**Files removed/inlined:**
- `extractCategoriesFromZip` — deleted, logic absorbed into the pipeline.
- `markSuccess`, `upsertDecodeStatus`, `upsertDecodeStatusSuccess` — replaced
  by direct UPSERTs against the `policy` table.

**Files kept:**
- `backfillDeferredVcFetches` — unchanged.

**Constants:**
- `MAX_ATTEMPTS = 5` (configurable via env if needed).

---

## Phase 5 — VC Ingest Enrichment

**`enqueueVcIpfsFetchIfReady`** — unchanged. VC fetches still gated on policy
decode success per existing logic.

**`ipfs-fetch.processor.ts`** — after writing content to `ipfs_files`:
1. Look up `message` row by `messageTimestamp`.
2. If `type = 'VC-Document'`:
   - Parse the content as JSON.
   - Read `credentialSubject[0].policyId` (string or undefined).
   - If present, `UPDATE message SET "policyId" = $1 WHERE "consensusTimestamp" = $2`.
   - If Phase 0 requires it, also set `policyVersion` / `policySourceCid`
     derived from the relationships chain.
3. MintToken / StandardRegistry VCs have no `policyId` → column stays NULL,
   no action.

---

## Phase 6 — Consumer Migration + New Endpoints

**Audit and rewrite consumers of old tables:**
- `project-mapper` service
- `business-view-builder`
- Registry views in API
- Any other read paths against `policy_decode_status.*` or `policy_schema.*`

All migrate to `policy.policyMapping` + `policy.schemaFields`. Consumers
filter entries by `schemaType`:
- **Project extractor** ignores entries where `schemaType` is `MintToken` or
  `StandardRegistry`.
- **Issuance extractor** (uses MintToken VCs) keyed by `tokenId` from
  `rawTokensJson`.
- **Registry extractor** (uses StandardRegistry VCs) for org profile data.

**New API endpoints:**

| Method | Path | Behavior |
|---|---|---|
| `POST` | `/policies/:topicId/redecode` | Enqueues policy-decode for the latest CID on this topic. Clears `policyMapping`, `schemaFields`. Sets `decodeStatus='pending'`, `attempts=0`. Optional `?forceRedownload=true` calls `storage.delete(cid)` first to bypass the zip cache. |
| `POST` | `/policies/:topicId/reparse-projects` | Re-runs project extraction across all `message` rows WHERE `policyId IN (SELECT "policyId" FROM policy WHERE "policyTopicId" = :topicId)`, using the **current** `policyMapping` so manual edits are honored. |

---

## Order of Execution

```
Phase 0 — Verify policyId uniqueness        ~30 min
Phase 1 — Migration                          ~1 h
Phase 2 — Local storage + interface          ~2 h
Phase 3 — Pipeline rewrite + tests           ~4–6 h
Phase 4 — Decode processor rewrite           ~3–4 h
Phase 5 — VC enrichment in ipfs-fetch        ~2 h
Phase 6 — Consumer migration + endpoints     ~4–8 h
─────────────────────────────────────────────
Total                                        ~3 days focused work + tests
```

No feature flag. Single deploy after Phase 6 finishes.

---

## Testing Strategy

| Layer | Test |
|---|---|
| Pipeline (Phase 3) | Snapshot test using MECD-v1.2 zip → expected `policyMapping` + `schemaFields`. |
| Decoder (Phase 4) | Integration test: fresh row → pending → decoded; failed retry up to MAX_ATTEMPTS; stale-pending recovery. |
| Storage (Phase 2) | Unit tests for `exists / read / write / delete`. |
| VC enrichment (Phase 5) | Unit: VC with policyId → column set. VC without policyId → column null. Malformed JSON → no crash, no update. |
| API (Phase 6) | `/redecode` clears mapping + enqueues. `/reparse-projects` runs against existing mapping without changing it. |

---

## Open Trade-offs Worth Knowing

1. **`rawSchemaJson` size.** Big policies may produce multi-MB JSONB rows.
   Acceptable per locked decision. If we later need to query INTO this column
   (e.g., "policies referencing schema X"), revisit by splitting back out.
2. **Manual mapping edits are lost on re-decode.** This is by design (the
   re-decode endpoint is explicit about overwriting). Users who want to
   preserve edits should use `/reparse-projects` instead.
3. **`policy.json`-sourced fields are copied per-project.** When projects
   persist their extracted data, fields like `sectoralScopes` are repeated on
   every project. Storage cost is negligible; benefit is no joins required
   on the read path.
4. **No automatic cleanup of orphaned zips in storage.** If a policy is
   deleted, its zip stays in storage. Add a janitor later if it becomes a
   space issue.
