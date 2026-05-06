# Bounty Criteria Matrix — VMR0015 v1.0

This document maps every DLT Earth bounty review criterion to the evidence in this submission. Reviewers can use it as a checklist.

The criteria below are derived from:
1. The DLT Earth bounty programme page (<https://www.dltearth.com/bounty-programme>)
2. The Hedera Guardian methodology digitization handbook (<https://guardian.hedera.com/methodology-digitization/methodology-digitization-handbook>)
3. The structure of merged precedent PRs (`hashgraph/guardian` PRs #5687, #5828, #5915 — accepted Verra/Gold Standard methodologies)

---

## A. Methodology Compliance

| # | Criterion | Status | Evidence |
|---|---|---|---|
| A1 | Implements a published Verra or Gold Standard methodology | ✅ | VMR0015 v1.0 — Verra revision of AMS-III.AV |
| A2 | Methodology equations reproducible from the policy | ✅ | `EMISSIONS_CALCULATION.md` — equations + 3 worked examples |
| A3 | Conditional/threshold logic from the methodology is enforced | ✅ Pass | VMR0015 conditional leakage on `f_woody`; `max(0, …)` clamp; **water-quality 0.95 hard gate implemented in `customLogicBlock.calculate_report_fields`** — `wq_pass_rate` is computed from per-test verdicts (`field2[*].field8`) and forces `ER_total = 0` when below 0.95. |
| A4 | Required schemas exist for each methodology entity | ✅ | 14 schemas; all published on topic `0.0.8865880` |
| A5 | Methodology version explicit in metadata | ✅ | Policy `version: 1.0.0`; name carries `VMR0015 v1.0` |

## B. Originality

| # | Criterion | Status | Evidence |
|---|---|---|---|
| B1 | No copied tokens from official policies | ✅ | CDM token `0.0.3969810` absent (forensic scan, 0/12 fail) |
| B2 | No copied topics from official policies | ✅ | CDM topic `0.0.3969809` absent |
| B3 | No copied schema IRIs from official policies | ✅ | Official IRIs `00ad3636/7c6e3bfe/a76cb53c/8f48da39` absent |
| B4 | No copied tags from official policies | ✅ | `approve_PP / approve_VVB / TrustChain / Choose_Roles / project_Pipeline / Monitoring_Reports_sr` absent |
| B5 | No third-party tool block plagiarism | ✅ | 0 `tool` blocks (entire AMS-III.AV graft layer removed) |
| B6 | Schemas authored from scratch | ✅ | 14 fresh UUIDs; field names and structure original to this submission |

## C. Workflow & Roles

| # | Criterion | Status | Evidence |
|---|---|---|---|
| C1 | At least 2 functional roles | ✅ | `Project Participant`, `VVB`, plus implicit `Owner` (admin) |
| C2 | Role hand-off is explicit and auditable | ✅ | 10 `reassigningBlock` instances |
| C3 | Trust chain (full report) implemented | ✅ | `vmr0015_trust_chain_report` (renamed from default `trustChainBlock`) — 1 `reportBlock` + 8 `reportItemBlock` |
| C4 | Policy publishes without validation errors | ✅ | Policy id `69fa5c34bafe0836d93bcde0` status PUBLISHED |
| C5 | Mint block correctly wired | ✅ | `mintDocumentBlock.tokenId = 0.0.8865898`, `rule = field7` (ER_total) |
| C6 | End-to-end lifecycle reaches mint | ✅ | `tc1_full_lifecycle.record` covers role choice → PP profile → project → report → VVB approve → owner approve → mint; mint quantity = 890 base units (8.90 CER, after u_def = 0.89) on token `0.0.8865898` |

## D. On-Chain Anchoring

| # | Criterion | Status | Evidence |
|---|---|---|---|
| D1 | Policy anchored on Hedera Consensus Service | ✅ | Topic `0.0.8865880` |
| D2 | Schemas anchored on HCS | ✅ | All 14 schemas on topic `0.0.8865880` |
| D3 | Issuer DID resolvable | ✅ | DID `67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869`; user topic `0.0.8865869` |
| D4 | HTS token created and policy-controlled | ✅ | Token `0.0.8865898`, fungible, decimals 2, supply key held by policy |
| D5 | IPFS pinning of policy and context | ✅ | Policy CID `QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN`; context CID `QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv` |
| D6 | Verifiable Credential signed at publish | ✅ | VC `urn:uuid:75fac51f-ba27-44f3-a678-1fa427cbc64c`; issuanceDate `2026-05-05T21:27:40.407Z`; Ed25519Signature2018 |

## E. Documentation

| # | Criterion | Status | File |
|---|---|---|---|
| E1 | README explaining the methodology | ✅ | `README.md` |
| E2 | LICENSE file | ✅ | `LICENSE` (Apache 2.0) |
| E3 | Workflow diagram | ✅ | `workflow.png` |
| E4 | On-chain artifact list | ✅ | `evidence/ON_CHAIN_ARTIFACTS.md` |
| E5 | Equation documentation | ✅ | `evidence/EMISSIONS_CALCULATION.md` |
| E6 | Use cases | ✅ | `evidence/USE_CASES.md` |
| E7 | Audit / forensics | ✅ | `AUDIT.md` (existing) + `evidence/FORENSIC_CHECK.md` |
| E8 | Reviewer guide | ✅ | `evidence/REVIEWER_GUIDE.md` |
| E9 | Comparison vs comparable Gold Standard work | ✅ | `evidence/COMPARISON_VS_GOLD_STANDARD.md` |

## F. Code Quality

| # | Criterion | Status | Evidence |
|---|---|---|---|
| F1 | All schema `$ref` resolve | ✅ | 0 unresolved refs across 14 schemas (verified by build script) |
| F2 | All `bindBlock` references resolve | ✅ | bindBlock for `vmr0015_trust_chain_report` updated; report block exists |
| F3 | No empty required fields in published policy | ✅ | Validation passed before publish (MGS green check) |
| F4 | UUIDs are fresh, not copied | ✅ | Fresh policy uuid, fresh schema uuids, fresh policyTag |

## G. Reproducibility

| # | Criterion | Status | Evidence |
|---|---|---|---|
| G1 | Policy file in repo matches published policy | ✅ | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/VMR0015.policy` (in PR) |
| G2 | Schemas in repo match published schemas | ✅ | All 14 schemas embedded in the .policy file |
| G3 | Worked example numbers reproducible from inputs | ✅ | Canonical TC1 reproducible — see `evidence/CANONICAL_TC1.md` and `tests/tc1_expected.json` |
| G4 | Test fixture provided | ✅ | `tc1_full_lifecycle.record` + `tests/tc1_expected.json` with `u_def = 0.89` uncertainty discount applied in `customLogicBlock.calculate_report_fields` (ER_gross 10.00 × u_def 0.89 → ER_net 8.90 → mint 890) |

---

## Summary scorecard

| Category | Pass | Total | Notes |
|---|---|---|---|
| A. Methodology compliance | 5 | 5 | A3 implemented — math-layer wq gate in code |
| B. Originality | 6 | 6 |  |
| C. Workflow & roles | 6 | 6 |  |
| D. On-chain anchoring | 6 | 6 |  |
| E. Documentation | 9 | 9 |  |
| F. Code quality | 4 | 4 |  |
| G. Reproducibility | 4 | 4 | All criteria pass |
| **Total** | **40** | **40** | All criteria pass; `u_def = 0.89` applied in code as of commit on top of validator-fix |

Every criterion has a concrete evidence pointer (a file, a Hedera topic, a Hashscan link, or an IPFS CID). A reviewer can verify each row without contacting the author. The one remaining partial row is documented honestly with a forward commitment rather than claimed as full pass.
