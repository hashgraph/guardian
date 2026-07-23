# Decode flow

## 1. Hedera topics & mirror-node messages

Guardian publishes everything it does to Hedera Consensus Service (HCS) topics.
Each message is signed, timestamped, and immutable; mirror nodes (e.g.
`mainnet-public.mirrornode.hedera.com`) expose them via REST and we ingest
them into the `message` table.

### Message types we care about

Each row in `message` carries `type`, `action`, `topicId`, `consensusTimestamp`,
plus an `options` jsonb and (for VCs) a `files` array of IPFS CIDs whose
content lands later in `documents`.

| `type`            | Meaning                                              | Where it's posted |
|-------------------|------------------------------------------------------|-------------------|
| `Standard Registry` | A registry's self-description (Verra, Capturiant…) | Registry's own topic |
| `Topic`            | Bookkeeping for a newly-created sub-topic           | Parent of the new topic |
| `Instance-Policy`  | A published policy version (the methodology)       | The methodology's policy topic |
| `Schema`           | Schema definition published by a policy            | Schemas sub-topic of an instance |
| `VC-Document`      | A Verifiable Credential payload (CID → IPFS)       | Instance / project sub-topic |
| `VP-Document`      | A Verifiable Presentation grouping VCs             | Same instance subtree |
| `Token`            | Token creation                                      | Same instance subtree |
| `MintToken` (VC)   | A specific issuance event (a VC, not its own type) | Project sub-topic |

`action` further qualifies the type. The combination that drives our policy
decode pipeline is `type='Instance-Policy' AND action='publish-policy'`.

## 2. Topic hierarchy

Topics form a tree via `options.parentId` on each `Topic` message. A typical
Capturiant project looks like this:

```
0.0.3054097                          Registry topic (Capturiant)
└── 0.0.3054105                      Methodology topic ("Capturiant Policy")
     └── 0.0.3300440                 Instance topic for v1.0 of that methodology
          ├── 0.0.3302747            Sub-topic holding Project VCs (registration)
          └── 0.0.3302758            Sub-topic holding mint cycle VCs
```

A real `Instance-Policy publish-policy` message at `topicId = 0.0.3054105`
declares this version exists, points at `options.instanceTopicId = 0.0.3300440`,
and ships the policy ZIP via `options.cid`. The ZIP contains the schemas the
worker imports as `policy_schema` rows.

When a project VC lands on topic `0.0.3302747`, walking up `parentId` through
`0.0.3300440 → 0.0.3054105` lets us answer "which methodology version does
this VC belong to?" — that traversal is exactly what
`ProjectMapperService.resolvePolicyTopicId` does.

## 3. Can we link mints to projects from topology alone?

Almost — topology tells us mints and projects are **siblings under the same
instance topic**, so we can narrow the candidate projects. But:

* If an instance hosts **one project**, all mint VCs in sibling sub-topics
  belong to that project. Topology is enough.
* If an instance hosts **multiple projects** (Capturiant example —
  `0.0.3300440` has at least 5 distinct project `cs.id`s under
  `0.0.3302747`), topology can't tell which mint goes with which project on
  its own. We need a business identifier published in both VCs.

For Capturiant, every Project VC and every Minting Token VC carries a
matching `field0` — the project's business ID:

```jsonc
// Project VC on topic 0.0.3302747 (schema f291d371…)
{ "id": "urn:uuid:8a7b…", "field0": "TBTMOBILET", "field20": "TBT Carbon Project", … }

// Minting Token VC on topic 0.0.3302758 (schema fc0efa2e…)
{ "id": "urn:uuid:95b1…", "field0": "TBTMOBILET", "field6": "{…\"projectId\":\"TBTMOBILET\"…}", … }
```

So the join key is `field0 == field0` across the two schemas — Hedera
topology gets us into the right instance, then a business-ID match picks the
right project. Other methodology families will use different field numbers
or paths, which is why the linkage needs to be discoverable per methodology
(by examining schemas + sample VCs) rather than hard-coded.

## 4. Decoding pipeline — seed topic → projects → issuances

Five BullMQ queues, two raw-cache tables, one normalized `message` table,
plus the downstream `policy_schema` / `policy_decode_status` / `business_view`
/ `token_cache` tables.

```
SEED_TOPIC_ID ──► TOPIC_SYNC (mirror-node-topics)
                       │  polls /messages, writes raw responses to
                       │  topic_cache + message_cache
                       ▼
                  MESSAGE_PARSE (mirror-node-messages)
                       │  reads message_cache, parses, INSERTs into message,
                       │  routes per type to specialised queues
                       ▼
            ┌──────────┼──────────┬──────────────┐
            ▼          ▼          ▼              ▼
        POLICY_DECODE  IPFS_FETCH TOKEN_SYNC  BUSINESS_VIEW_BUILD
```

### Step-by-step

1. **Seed** — `sync-scheduler.service.ts` upserts a row into `topic_cache`
   for `SEED_TOPIC_ID` (the Hedera Standard-Registry root topic for the
   network) and enqueues a `TOPIC_SYNC` job.

2. **Topic crawl** — `topic-sync.processor.ts` calls the mirror-node REST
   API, pages through `/topics/:id/messages`, writes the raw payloads into
   `message_cache`, and updates `topic_cache.hasNext` so the next poll
   resumes from the right `consensusTimestamp`. When a `Topic` message
   announces a child topic, the crawler upserts a `topic_cache` row for
   that topic too — so the whole subtree gets discovered without manual
   intervention.

3. **Per-message routing** — `message-process.processor.ts` runs once per
   raw row, parses it, INSERTs the canonical form into `message`, then
   marks the source row in `message_cache` as `parsed`. Based on
   `message.type` / `message.action` it dispatches:
   - `Standard Registry` → upserts a REGISTRY row in `business_view`.
   - `Instance-Policy / publish-policy` → enqueues `POLICY_DECODE` with
     `{ cid, messageTimestamp, policyTopicId }`.
   - `VC-Document` → enqueues `IPFS_FETCH` for each CID in `m.files`
     (only when the parent policy's decode status is `success`; otherwise
     deferred until policy decode completes).
   - `Token` → leaves it for the token sync sweep.

4. **Policy decode** — `policy-decode.processor.ts` downloads the policy
   ZIP from IPFS, imports schemas into `policy_schema`, runs the
   mapping pipeline (`CrossSchemaFuzzyMapperService` →
   `derivePerPolicyProjectMeta`), writes the result to
   `policy_decode_status` (`fieldMap`, `projectFieldMap`, `projectSchemaId`,
   `projectGeoKey`, etc.), then backfills any deferred VC fetches.

5. **VC fetch + project mapping** — `ipfs-fetch.processor.ts` pulls each
   VC's JSON from IPFS, writes it into `message.documents`, then calls
   `ProjectMapperService.upsertProjectFromVc(consensusTimestamp)`. That:
   - Looks up `policy_decode_status.fieldMap` for the VC's policy.
   - For each `PROJECT_EXTRACT_FIELDS` entry whose mapped schema matches
     this VC's schema, reads the value at the configured path.
   - Resolves `policyTopicId` + `instanceTopicId` by walking `parentId`.
   - Falls back to coordinate-based country lookup via `ReverseGeoService`
     when the schema didn't yield a country but lat/lng did.
   - UPSERTs into `business_view` (viewType `PROJECT`), keyed by
     `projectKey = cs.id`, merging fields and appending the entry to
     `businessData.linkedVcs[]`. Credits/vcCount are gated on the
     timestamp not already being in `linkedVcs`, so the upsert is
     idempotent.

6. **Issuance decoding** — `MintToken` VCs follow the same path as any
   other VC, but they have no `cs.id`. The mapper walks back to find the
   most recent prior `cs.id` in the same topic (the project anchor),
   attributes that mint's `amount` as credits, and lets `token-sync.processor.ts`
   refresh the `token_cache` table with on-chain supply/retired counts.
   Project pages and the methodology stats MV join issuances on
   `relatedTopicId` / `policyTopicId` to surface the totals.

End result: `business_view` ends up with one REGISTRY row per registry,
one METHODOLOGY row per published policy version, one PROJECT row per
`cs.id`, plus per-token CREDIT rows joined in by `BUSINESS_VIEW_BUILD`.

## 5. Reparse

Reparse re-runs the project-mapping step over VCs already fetched into the
DB — useful when the methodology mapping changes (manually via the editor,
or implicitly via a redecode) and existing project rows need to pick up
the new extraction rules without re-fetching from IPFS.

Three triggers, all backed by the same per-VC job (`PROJECT_REPARSE`
queue, `project-reparse.processor.ts` calls `upsertProjectFromVc`):

| Endpoint | Scope |
|---|---|
| `POST /:network/projects/:id/re-extract` | Just this project's `linkedVcs[]` |
| `POST /:network/methodologies/:id/reparse-projects` | Every VC under the methodology's topic subtree |
| `POST /:network/methodologies/reparse-projects` | Every methodology in the network (loops the above) |

### How it stays correct

* **Stale-job removal** — `MappingReprocessService` deletes any existing
  job for the same canonical `project-reparse-<ts>` jobId before
  re-enqueueing under a fresh unique id. Without this, BullMQ would
  silently skip the second click because it remembers the previous
  completed job.
* **Worker-side idempotency** — the upsert's SQL guards credits and
  `vcCount` with `linkedVcs @> [{consensusTimestamp: $1}]`, so running
  the same VC twice doesn't double-count.
* **Country clearance** — when the project's current schema is the
  configured Country source but extraction was rejected (e.g. value too
  long), the upsert explicitly writes `country = null` so a stale value
  from a previous bad mapping doesn't survive.

### Typical mapping-fix loop

1. Edit `fieldMap` via the methodology page (or PATCH directly).
2. Click "Re-parse projects" on that methodology (or "Re-extract" on a
   single project for a tight feedback loop).
3. After the worker drains the queue (seconds), refresh; the
   `mv_methodology_stats` MV picks up the new counts on its next scheduled
   refresh (default 60 s).




  ┌────────────────────────┬──────────────────────────────────────────────────────────────┐
  │          Type          │                                      Dropped fields                                       │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ DID-Document           │ url                                                                                       │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Formula                │ policyTopicId, policyInstanceTopicId, uri                                                 │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Guardian-Role-Document │ issuer, encodedData, uri                                                                  │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Instance-Policy        │ url                                                                                       │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Policy                 │ url                                                                                       │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Role-Document          │ issuer, encodedData, uri, role, group                                                     │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Schema                 │ entity, document_cid, document_url, context_cid, context_url                              │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Schema-Package         │ schemas, document_cid, document_uri, context_cid, context_uri, metadata_cid, metadata_uri │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Standard Registry      │ (none in this sample — attributes is kept)                                                │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Tag                    │ target, operation, date, entity, uri                                                      │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Token                  │ decimals                                                                                  │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Tool                   │ tagsTopicId, uri                                                                          │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Topic                  │ rationale                                                                                 │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ User-Permissions       │ issuer, encodedData, uri, user                                                            │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ VC-Document            │ url                                                                                       │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ VP-Document            │ url                                                                                       │
  └────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────┘

 
  Guardian-Role-Document — 1725633629.566705183

  eyJpZCI6IjRhOWY3YWJkLTNiODEtNDg1OC1hZjIwLTY5MzgyOTY0YzA5MiIsInN0YXR1cyI6IklTU1VFIiwidHlwZSI6Ikd1YXJkaWFuLVJvbGUtRG9jdW1lbnQiLCJhY3R
  pb24iOiJjcmVhdGUtcm9sZSIsImxhbmciOiJlbi1VUyIsImlzc3VlciI6ImRpZDpoZWRlcmE6bWFpbm5ldDo2aEdMdEUyYkthN1NIUEx2R3hQMkh3UE5yTG5DNjNXRm1BVT
  NaYU5zbkJ6XzAuMC43MDA4MzQ5IiwiZW5jb2RlZERhdGEiOmZhbHNlLCJjaWQiOiJiYWZrcmVpZ21xZGx3eG52eG5tYXk3MnlnZXZvYXRhajdtbjZqdGFuaDZzdWo2ZXpiY
  3J1NWd3cXF6aSIsInVyaSI6ImlwZnM6Ly9iYWZrcmVpZ21xZGx3eG52eG5tYXk3MnlnZXZvYXRhajdtbjZqdGFuaDZzdWo2ZXpiY3J1NWd3cXF6aSIsInV1aWQiOiI3YzEz
  YTM3MS04MDJlLTQ1OTQtOWI3NC03YTJiNzM2MmZmMzYiLCJuYW1lIjoiRGVmYXVsdCBwb2xpY3kgdXNlciIsImRlc2NyaXB0aW9uIjoiRGVmYXVsdCBwb2xpY3kgdXNlciJ
  9

  Instance-Policy — 1666705883.609541003

  eyJpZCI6ImM3ZDAxYWNjLTExYjQtNDM1NC1hNTVkLWYyYjQ1ZmFjOTFlYiIsInN0YXR1cyI6IklTU1VFIiwidHlwZSI6Ikluc3RhbmNlLVBvbGljeSIsImFjdGlvbiI6InB
  1Ymxpc2gtcG9saWN5IiwibGFuZyI6ImVuLVVTIiwidXVpZCI6IjM2MmQ1YjE3LTcwZDMtNDcxNi1hZjUzLWNmM2Y3MmY2MTkzYSIsIm5hbWUiOiJBbWFuYSBTb2xhciBSb2
  9mdG9wIiwiZGVzY3JpcHRpb24iOiJHQ0NNMDAxLSBNZXRob2RvbG9neSBmb3IgUmVuZXdhYmxlIEVuZXJneSBHZW5lcmF0aW9uIFByb2plY3RzIFN1cHBseWluZyBFbGVjd
  HJpY2l0eSB0byBHcmlkIG9yIENhcHRpdmUgQ29uc3VtZXJzLiBWMy4wIiwidG9waWNEZXNjcmlwdGlvbiI6IlZFUklGSUVEIiwidmVyc2lvbiI6IjEuMC4wIiwicG9saWN5
  VGFnIjoiNjM1N2U0NDk2MjQwZDllZWM5ZDZhYWY3Iiwib3duZXIiOiJkaWQ6aGVkZXJhOm1haW5uZXQ6NmVUekh6RkZlZFR0aXdQaTFqd2k4NnY4V0JVdlpOSFNTQmhtVU5
  pa2ZHRVY7aGVkZXJhOm1haW5uZXQ6dGlkPTAuMC4xMzgwNzI1IiwidG9waWNJZCI6IjAuMC4xMzgwOTcwIiwiY2lkIjoiYmFma3JlaWVtZDJnMmx5YWk0YW82ZjJ3ZG83M3
  ptaXU0M2JtdWE2dmJhdWdrenhocXZ0emxicXFjZ2UiLCJ1cmwiOiJodHRwczovL2lwZnMuaW8vaXBmcy9iYWZrcmVpZW1kMmcybHlhaTRhbzZmMndkbzczem1pdTQzYm11Y
  TZ2YmF1Z2t6eGhxdnR6bGJxcWNnZSJ9

  Tag — 1694106847.903589041

  eyJpZCI6Ijk2NGM5ZTQyLTU0ODMtNDM4NS1iYTJmLTcxMzI4ZjE3Zjk1MiIsInN0YXR1cyI6IklTU1VFIiwidHlwZSI6IlRhZyIsImFjdGlvbiI6InB1Ymxpc2gtdGFnIiw
  ibGFuZyI6ImVuLVVTIiwidXVpZCI6ImVjZDNlNmI1LWU1ZDktNDExMS1hYWRmLWU5ZWE5ZDViNTc2MyIsIm5hbWUiOiJDb29rc3RvdmUgRWZmaWNpZW5jeSBUZXN0IGFuZC
  BNb25pdG9yaW5nIE1ldGhvZCIsImRlc2NyaXB0aW9uIjoiIiwib3duZXIiOiJkaWQ6aGVkZXJhOm1haW5uZXQ6NFhqcXZYZU1ZUGVzMWRtUFZFZk1tZXdOZ0VSOHplZEZpc
  jN1ZlpOMmduTVBfMC4wLjM3MzI2NjUiLCJ0YXJnZXQiOiIxNjk0MTA2NzE0LjU4Mjg2MTUxNyIsIm9wZXJhdGlvbiI6IkNyZWF0ZSIsImRhdGUiOiIyMDIzLTA5LTA3VDE3
  OjE0OjAxLjkwNFoiLCJlbnRpdHkiOiJQb2xpY3kiLCJjaWQiOiJiYWZrcmVpYWlpaGxlZTY2bW5jcnphaDJoZXIzNXJqZDNzcnIzcmRqdWl5enc2dXp2eWZoc2ZhZWp3ZSI
  sInVyaSI6ImlwZnM6Ly9iYWZrcmVpYWlpaGxlZTY2bW5jcnphaDJoZXIzNXJqZDNzcnIzcmRqdWl5enc2dXp2eWZoc2ZhZWp3ZSJ9

VC-Document — 1666697348.328880003 ibGFuZyI6ImVuLVVTIiwidXVpZCI6ImVjZDNlNmI1LWU1ZDktNDExMS1hYWRmLWU5ZWE5ZDViNTc2MyIsIm5hbWUiOiJDb29rc3RvdmUgRWZmaWNpZW5jeSBUZXN0IGFuZC BNb25pdG9yaW5nIE1ldGhvZCIsImRlc2NyaXB0aW9uIjoiIiwib3duZXIiOiJkaWQ6aGVkZXJhOm1haW5uZXQ6NFhqcXZYZU1ZUGVzMWRtUFZFZk1tZXdOZ0VSOHplZEZpc jN1ZlpOMmduTVBfMC4wLjM3MzI2NjUiLCJ0YXJnZXQiOiIxNjk0MTA2NzE0LjU4Mjg2MTUxNyIsIm9wZXJhdGlvbiI6IkNyZWF0ZSIsImRhdGUiOiIyMDIzLTA5LTA3VDE3 OjE0OjAxLjkwNFoiLCJlbnRpdHkiOiJQb2xpY3kiLCJjaWQiOiJiYWZrcmVpYWlpaGxlZTY2bW5jcnphaDJoZXIzNXJqZDNzcnIzcmRqdWl5enc2dXp2eWZoc2ZhZWp3ZSI sInVyaSI6ImlwZnM6Ly9iYWZrcmVpYWlpaGxlZTY2bW5jcnphaDJoZXIzNXJqZDNzcnIzcmRqdWl5enc2dXp2eWZoc2ZhZWp3ZSJ9 

VC-Document — 1666697348.328880003 eyJpZCI6Ijk2ZDJiMmQzLTQwYzgtNDk0OC1iMTcyLTY2MTdlOTk0MzA1YiIsInN0YXR1cyI6IklTU1VFIiwidHlwZSI6IlZDLURvY3VtZW50IiwiYWN0aW9uIjoiY3JlYXR lLXZjLWRvY3VtZW50IiwibGFuZyI6ImVuLVVTIiwiaXNzdWVyIjoiZGlkOmhlZGVyYTptYWlubmV0OjZlVHpIekZGZWRUdGl3UGkxandpODZ2OFdCVXZaTkhTU0JobVVOaW tmR0VWO2hlZGVyYTptYWlubmV0OnRpZD0wLjAuMTM4MDcyNSIsImNpZCI6ImJhZmtyZWlocnB2bW0zaG9mMzJ6eXc2cHhnYmZmZ3hoMmZucHo0a3dmYmI2c3d1enQ0NDRic zVjajN5IiwidXJsIjoiaHR0cHM6Ly9pcGZzLmlvL2lwZnMvYmFma3JlaWhycHZtbTNob2YzMnp5dzZweGdiZmZneGgyZm5wejRrd2ZiYjZzd3V6dDQ0NGJzNWNqM3kifQ== 

VP-Document — 1666707380.631604003 eyJpZCI6ImQ2ODU4NGI1LTQyOTYtNDYxOC04MzI5LTM2ZjNhNzI1N2I2MSIsInN0YXR1cyI6IklTU1VFIiwidHlwZSI6IlZQLURvY3VtZW50IiwiYWN0aW9uIjoiY3JlYXR lLXZwLWRvY3VtZW50IiwibGFuZyI6ImVuLVVTIiwiaXNzdWVyIjpudWxsLCJyZWxhdGlvbnNoaXBzIjpbIjE2NjY3MDczNTQuNjEyNDQ3NDk5IiwiMTY2NjcwNzM2OS45ND lLXZjLWRvY3VtZW50IiwibGFuZyI6ImVuLVVTIiwiaXNzdWVyIjoiZGlkOmhlZGVyYTptYWlubmV0OjZlVHpIekZGZWRUdGl3UGkxandpODZ2OFdCVXZaTkhTU0JobVVOaW tmR0VWO2hlZGVyYTptYWlubmV0OnRpZD0wLjAuMTM4MDcyNSIsImNpZCI6ImJhZmtyZWlocnB2bW0zaG9mMzJ6eXc2cHhnYmZmZ3hoMmZucHo0a3dmYmI2c3d1enQ0NDRic zVjajN5IiwidXJsIjoiaHR0cHM6Ly9pcGZzLmlvL2lwZnMvYmFma3JlaWhycHZtbTNob2YzMnp5dzZweGdiZmZneGgyZm5wejRrd2ZiYjZzd3V6dDQ0NGJzNWNqM3kifQ== 

VP-Document — 1666707380.631604003 eyJpZCI6ImQ2ODU4NGI1LTQyOTYtNDYxOC04MzI5LTM2ZjNhNzI1N2I2MSIsInN0YXR1cyI6IklTU1VFIiwidHlwZSI6IlZQLURvY3VtZW50IiwiYWN0aW9uIjoiY3JlYXR BNb25pdG9yaW5nIE1ldGhvZCIsImRlc2NyaXB0aW9uIjoiIiwib3duZXIiOiJkaWQ6aGVkZXJhOm1haW5uZXQ6NFhqcXZYZU1ZUGVzMWRtUFZFZk1tZXdOZ0VSOHplZEZpc jN1ZlpOMmduTVBfMC4wLjM3MzI2NjUiLCJ0YXJnZXQiOiIxNjk0MTA2NzE0LjU4Mjg2MTUxNyIsIm9wZXJhdGlvbiI6IkNyZWF0ZSIsImRhdGUiOiIyMDIzLTA5LTA3VDE3 OjE0OjAxLjkwNFoiLCJlbnRpdHkiOiJQb2xpY3kiLCJjaWQiOiJiYWZrcmVpYWlpaGxlZTY2bW5jcnphaDJoZXIzNXJqZDNzcnIzcmRqdWl5enc2dXp2eWZoc2ZhZWp3ZSI sInVyaSI6ImlwZnM6Ly9iYWZrcmVpYWlpaGxlZTY2bW5jcnphaDJoZXIzNXJqZDNzcnIzcmRqdWl5enc2dXp2eWZoc2ZhZWp3ZSJ9 

VC-Document — 1666697348.328880003 eyJpZCI6Ijk2ZDJiMmQzLTQwYzgtNDk0OC1iMTcyLTY2MTdlOTk0MzA1YiIsInN0YXR1cyI6IklTU1VFIiwidHlwZSI6IlZDLURvY3VtZW50IiwiYWN0aW9uIjoiY3JlYXR lLXZjLWRvY3VtZW50IiwibGFuZyI6ImVuLVVTIiwiaXNzdWVyIjoiZGlkOmhlZGVyYTptYWlubmV0OjZlVHpIekZGZWRUdGl3UGkxandpODZ2OFdCVXZaTkhTU0JobVVOaW tmR0VWO2hlZGVyYTptYWlubmV0OnRpZD0wLjAuMTM4MDcyNSIsImNpZCI6ImJhZmtyZWlocnB2bW0zaG9mMzJ6eXc2cHhnYmZmZ3hoMmZucHo0a3dmYmI2c3d1enQ0NDRic zVjajN5IiwidXJsIjoiaHR0cHM6Ly9pcGZzLmlvL2lwZnMvYmFma3JlaWhycHZtbTNob2YzMnp5dzZweGdiZmZneGgyZm5wejRrd2ZiYjZzd3V6dDQ0NGJzNWNqM3kifQ== 

VP-Document — 1666707380.631604003 eyJpZCI6ImQ2ODU4NGI1LTQyOTYtNDYxOC04MzI5LTM2ZjNhNzI1N2I2MSIsInN0YXR1cyI6IklTU1VFIiwidHlwZSI6IlZQLURvY3VtZW50IiwiYWN0aW9uIjoiY3JlYXR lLXZwLWRvY3VtZW50IiwibGFuZyI6ImVuLVVTIiwiaXNzdWVyIjpudWxsLCJyZWxhdGlvbnNoaXBzIjpbIjE2NjY3MDczNTQuNjEyNDQ3NDk5IiwiMTY2NjcwNzM2OS45ND QyNjMwNzIiXSwiY2lkIjoiYmFma3JlaWdvbzViZnZhYTRoa2Jjank3aWRxbGFicHJoa2ZlNGN5Mmt6d3pkbno3cGhybHplcXk1enkiLCJ1cmwiOiJodHRwczovL2lwZnMua W8vaXBmcy9iYWZrcmVpZ29vNWJmdmFhNGhrYmNqeTdpZHFsYWJwcmhrZmU0Y3kya3p3emRuejdwaHJsemVxeTV6eSJ9


User-Permissions

  1775720163.679868000 — cid: QmaSL2RHvmzEywSJkSrsR72Zef7nfePL2WAtzJHH14ARrj

  eyJpZCI6IjNiOGM1NjllLTZhOTctNDQ1Ni05YmViLTI3ZDJhMjYwOWZkYyIsInN0YXR1cyI6IklTU1VFIiwidHlwZSI6IlVzZXItUGVybWlzc2lvbnMiLCJhY3Rpb24iOiJ
  zZXQtcm9sZSIsImxhbmciOiJlbi1VUyIsImlzc3VlciI6ImRpZDpoZWRlcmE6bWFpbm5ldDpCUEdRZWNNSmMyY3BUM3o2TkpIYXNvS0NEemtQNFJnQ0tUcmhrMVZzRGhhdV
  8wLjAuOTI4MDc4MCIsImVuY29kZWREYXRhIjpmYWxzZSwiY2lkIjoiUW1hU0wyUkh2bXpFeXdTSmtTcnNSNzJaZWY3bmZlUEwyV0F0ekpISDE0QVJyaiIsInVyaSI6ImlwZ
  nM6Ly9RbWFTTDJSSHZtekV5d1NKa1Nyc1I3MlplZjduZmVQTDJXQXR6SkhIMTRBUnJqIiwidXNlciI6ImRpZDpoZWRlcmE6bWFpbm5ldDpGeDI2ZEdVWjRSWFdid0hwdVR5
  WmhDeUxtdFBFUERXWmMydkgxQXBoRDhBal8wLjAuOTI4MDc4MCJ9