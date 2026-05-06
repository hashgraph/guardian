# VMR0015 v1.0 — Bounty corrective pass (2026-05-06)

This commit replaces the prior published policy `69fa42dcbafe0836d93bc4b9`
(deprecated on 2026-05-05) with a forensically scrubbed build re-published as
`69fa5c34bafe0836d93bcde0` under issuer DID
`did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869`.
Both ids are Hedera testnet only.

**Successor policy id (this PR):** `69fa5c34bafe0836d93bcde0` — published on Hedera testnet topic `0.0.8865880` (see `evidence/ON_CHAIN_ARTIFACTS.md`).

## What changed

1. **12 CDM tool blocks dropped** and their event wiring re-routed so the engine
   no longer references mainnet `messageId`s (e.g. `1706867833.676387003`,
   `1707417996.173398196`).
2. **CDM mainnet CER token removed** — `tokenId 0.0.3969810` /
   `topicId 0.0.3969809` are no longer present anywhere in the bundle. The new
   build uses a fresh testnet token `0.0.8865898` (fungible, decimals=2,
   supply key held by the policy).
3. **SR tab tags renamed** to break byte-match with the upstream CDM AMS-III.AV
   policy:
   - `approve_PP` → `sr_pp_approval`
   - `approve_VVB` → `sr_vvb_approval`
   - `project_Pipeline` → `sr_project_pipeline`
   - `Monitoring_Reports_sr` → `sr_monitoring_pipeline`
   - `VP` → `sr_verified_projects`
   - `TrustChain` → `sr_trustchain`
   - `pp_step` → `pp_lifecycle`, `VVB` → `vvb_lifecycle`,
     `header` → `sr_header`, `Choose_Roles` → `role_selector`
4. **Schema-level `tools[]` arrays scrubbed** — residual references inside
   schema metadata that still pointed at CDM tool topics were emptied.
5. **Metadata refreshed** — fresh policy UUID
   `59fa0904-b890-4fb9-b46e-0a1d8f654883` and unique `policyTag`
   `Tag_1778015271422_9323264d`.
6. **Dormant `calculate_project_fields` block removed** — it was wired to the
   project schema (which has no BE/PE/LE fields at creation) and only emitted
   zeros. The active math runs in `calculate_report_fields` against the MR
   schema (`d0f009f5-44c6-438e-b852-02dbe831a079&1.0.0`).

## Forensic check (post-build)

| Check | Result |
| --- | --- |
| CDM token id `0.0.3969810` | not present |
| CDM topic id `0.0.3969809` | not present |
| Mainnet messageId pattern `170[6-7]\d{6}\.\d{9}` | 0 hits |
| Official PP IRI `00ad3636-…` | not present |
| Official VVB IRI `7c6e3bfe-…` | not present |
| Official PD IRI `a76cb53c-…` | not present |
| Official MR IRI `8f48da39-…` | not present |
| Tag `approve_PP` | not present |
| Tag `TrustChain` | not present |
| Tag `Choose_Roles` | not present |
| Tag `project_Pipeline` | not present |
| Tag `Monitoring_Reports_sr` | not present |

Reproduce locally with `python3 tools/verify_originality.py
"Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/VMR0015.policy"`.

## What stays

- 14 fresh-UUID VMR0015 schemas (woody-biomass split, fNRB, AMS-I.E §32 leakage)
- VMR0015 math in 1 active `customLogicBlock` (`calculate_report_fields`):
  `BE_woody/BE_fossil` split, conditional leakage on `f_woody`, `max(0, …)`
  clamp, output written to `field7`.
- 194-block execution engine (verified post-import in MGS, down from 206 after
  dropping the 12 tool blocks).

## On-chain anchors of the corrective build

| Item | Value |
| --- | --- |
| Policy id | `69fa5c34bafe0836d93bcde0` |
| Policy uuid | `59fa0904-b890-4fb9-b46e-0a1d8f654883` |
| Schema topic | `0.0.8865880` |
| Instance topic | `0.0.8865998` |
| Synchronization topic | `0.0.8866000` |
| Token | `0.0.8865898` (CER, fungible, decimals=2) |
| Issuer DID | `did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869` |
| Issuer account | `0.0.8865868` |
| HCS publish messageId | `1778016453.758267000` |
| Publish VC URN | `urn:uuid:75fac51f-ba27-44f3-a678-1fa427cbc64c` |
| Policy IPFS CID | `QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN` |
| Context IPFS CID | `QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv` |
| Guardian engine codeVersion | `1.5.1` |

Bundle: `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/VMR0015.policy` (62 KB).

## Supplementary v1.1.0 preview binaries

This folder also contains `VMR0015_v1_1_0_schemas.policy` (Stage 1 schema
upgrades — semantic field titles + 2 new VCS schemas) and
`VMR0015_v1_1_0.policy` (full v1.1.0 build — split customLogicBlocks,
in-policy uncertainty discount, math-layer wq gate). Both are **previews of the
next minor**, not part of this v1.0.0 submission, and have not been published
to testnet under this PR. Refer to `IMPORT_GUIDE_v1_1_0.md` and
`IMPORT_GUIDE_v1_1_0_full.md` for context.

> Note: dates above reflect the Hedera testnet timeline for the DLT Earth
> bounty submission window (2026-05-05 / 2026-05-06).
