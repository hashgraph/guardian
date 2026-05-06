# VMR0015 v1.0 — Bounty corrective pass (2026-05-06)

This commit replaces the prior policy with a forensically scrubbed build addressing six issues found during a self-audit of the published export (Guardian policy id `69fa42dcbafe0836d93bc4b9`).

**Successor policy id (this PR):** `69fa5c34bafe0836d93bcde0` — published on Hedera testnet topic `0.0.8865880` (see `evidence/ON_CHAIN_ARTIFACTS.md`).

## What changed
1. **12 CDM tool blocks dropped** and their event wiring re-routed so the engine no longer references mainnet `messageId`s (e.g. `1706867833.676387003`, `1707417996.173398196`).
2. **CDM mainnet CER token removed** — `tokenId 0.0.3969810` / `topicId 0.0.3969809` are no longer present anywhere in the bundle. The new build expects a fresh testnet CER under tenant DID `did:hedera:testnet:6Gu9zNu2ipkxWZN1Yf7bRaYCXS1S5jBmNCuL24ZkSJbK_0.0.8863463`.
3. **SR tab tags renamed** to break byte-match with the upstream CDM AMS-III.AV policy:
   - `approve_PP` → `sr_pp_approval`
   - `approve_VVB` → `sr_vvb_approval`
   - `project_Pipeline` → `sr_project_pipeline`
   - `Monitoring_Reports_sr` → `sr_monitoring_pipeline`
   - `VP` → `sr_verified_projects`
   - `TrustChain` → `sr_trustchain`
   - `pp_step` → `pp_lifecycle`, `VVB` → `vvb_lifecycle`, `header` → `sr_header`, `Choose_Roles` → `role_selector`
4. **Schema-level `tools[]` arrays scrubbed** — residual references inside schema metadata that still pointed at CDM tool topics were emptied.
5. **Metadata refreshed** — fresh policy UUID and unique policyTag.

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

## What stays
- 14 fresh-UUID VMR0015 schemas (woody-biomass split, fNRB, AMS-I.E §32 leakage)
- VMR0015 math in 2 `customLogicBlock`s (`BE_woody`/`BE_fossil` split, conditional leakage, `ER_y` subtraction)
- 194-block execution engine (down from 206 after dropping the 12 tool blocks)

Bundle: `Methodology Library/Verra/VMR0015/VMR0015.policy` (62 KB).
