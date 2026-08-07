# Policy Decode

How a Guardian policy is decoded into the schema and field mappings the Atlas relies on, and the
standing decisions that govern retries, re-decoding and storage.

## Overview

Decoding turns a published Guardian policy into two artefacts the rest of the system reads:

- **`policyMapping`** — which schema field holds each project value we extract
- **`schemaFields`** — the flattened field inventory of every schema the policy declares

Both are stored as JSONB columns on the **`policy`** table (`src/shared/entities/policy.entity.ts`),
alongside the decode status that drives retry behaviour. The decode job itself runs in
`policy-decode.processor.ts`; the mapping algorithm it delegates to is described in
[Mapping module](mapping-module.md).

> **NOTE:** A single `policy` table holds all of this. Earlier documentation referred to separate
> `policy_schema` and `policy_decode_status` tables — those were collapsed into `policy` and no longer
> exist.

## Policy identity

A policy row is identified by `(policyId, version)`. The same `policyTopicId` may therefore have
several rows, one per published version. Verifiable Credentials link to a policy through an indexed
`message.policyId` column, populated after the IPFS fetch from `credentialSubject[0].policyId`.

## Standing decisions

These were settled when the decode pipeline was built and still govern its behaviour.

| Topic | Decision |
|---|---|
| Retry semantics | `decoded` → skip. `pending` older than `IPFS_TIMEOUT * 10` → retry. `failed` with `attempts < MAX` → retry. `failed` with `attempts >= MAX` → skip and log. |
| Stale-pending cleanup | No cron job. The retry guard covers it — a `pending` row older than `IPFS_TIMEOUT * 10` becomes eligible at the next job pickup. |
| Re-decode a policy | Regenerates `policyMapping` and `schemaFields`. **Overwrites manual mapping edits.** |
| Re-parse projects | Re-runs project extraction against the current `policyMapping`. Manual edits are honoured. |
| `rawSchemaJson` shape | A single JSONB column shaped `{iri: schemaDoc}`. The size trade-off is accepted. |
| File storage backend | Local filesystem, behind a `PolicyZipStorage` interface so S3/MinIO can be added later without touching call sites. |
| Mapping shape | Grouped by `PROJECT_EXTRACT_FIELDS` name. |
| `isProjectSchema` | A priority hint inside `policyMapping`, not a hard filter. |
| Category extraction | Not a separate stage. Sectoral scopes and emission-reduction approach come from the same field pipeline, then get copied into the project's extracted data for the frontend to read. |

### Which VCs feed project extraction

| VC type | Treatment |
|---|---|
| `MintToken` | Skipped for project extraction; used for **issuance**, keyed by `tokenId` |
| `StandardRegistry` | Skipped for project extraction; used for **registry** data |
| All others | Used for project extraction normally |

## Re-decode and re-parse

The distinction matters operationally:

- **Re-decode** regenerates the mapping from the policy itself. Reach for it when the policy changed
  or the mapping is wrong. It discards manual mapping edits.
- **Re-parse** leaves the mapping alone and re-runs extraction over documents. Reach for it when the
  mapping is right but project rows are stale.

## Additional documentation

- [Architecture overview](README.md) — the full pipeline this stage belongs to
- [Decode method design](decode-method.md) — how mappings are derived and how VCs are attributed to projects
- [Decode flow](decode-flow.md) — message types, queues and the reparse endpoints
- [Mapping module](mapping-module.md) — the strategy layer decode delegates to
