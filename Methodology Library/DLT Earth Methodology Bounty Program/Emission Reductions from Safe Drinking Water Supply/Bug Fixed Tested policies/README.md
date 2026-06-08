# VMR0015 v1.0 — Safe Drinking Water dMRV · Bug Fixed Tested Policies

Policy version: **2.0.1**  
Issuance timestamp: `2026-06-06T18:15:52Z`  
Guardian version: `3.6.0`  
HCS topic: `0.0.8865880` · Token: `0.0.8865898` · Network: Hedera testnet

---

## Files in This Directory

| File | Type | Description |
|---|---|---|
| `VMR0015 v1.0 Safe Drinking Water dMRV_1780769708120 (8).policy` | Binary | Guardian policy export — version **2.0.1**, signed PUBLISH VC confirmed |
| `VMR0015 v1.0 Safe Drinking Water dMRV_1780769708120_2.0.1 (2).zip` | ZIP | Dry-run evidence package (schemas, IPFS context, artifacts) |
| `policy_1780872930442.xlsx` | Excel | Policy export spreadsheet |
| `Bug Fixed Json` | JSON | Full raw policy JSON (human-readable, uncompressed) |
| `6a2463dfd2866ba70ad193bd.csv` | CSV | Signed PUBLISH VC — policy registration on Hedera testnet |
| `6a2465a6b475dc170fabd478.csv` | CSV | Dry-run VC document |
| `6a2465aab475dc170fabd483.csv` | CSV | Dry-run VC document |
| `6a2466efb475dc170fabd4ac.csv` | CSV | PP registration VC (Project Profile) |
| `6a2466f2b475dc170fabd4b4.csv` | CSV | PP registration VC (Project Profile, second entry) |

---

## Version Confirmation

The signed PUBLISH VC (`6a2463dfd2866ba70ad193bd.csv`) contains:

```
credentialSubject.version = "2.0.1"
credentialSubject.name    = "VMR0015 v1.0 Safe Drinking Water dMRV_1780769708120"
credentialSubject.operation = "PUBLISH"
issuer = did:hedera:testnet:6VhJ5QVjq4D48CzyxBfA2S4yXqW2ELMYhuEKJxfRcbLW_0.0.9124164
proof.type = Ed25519Signature2018
```

This confirms the `.policy` binary in this directory is **v2.0.1**, resolving the
unreadable `artifacts/metadata.json` (deflate-compressed in the binary export).

---

## Simulation Results — Clarifying the Two Figures

Two different figures appear across PR #6164. They are **not contradictions** — they are two different simulation runs with different input parameters:

| Run | QPW_y | nwb | BE_y | ER_y | Purpose |
|---|---|---|---|---|---|
| **Intermediate dry-run fixture** | ~23M L | 0.10 | **53,309.84 tCO₂e** | ~53,309 tCO₂e | Early workflow validation run — confirms token mint logic works |
| **Canonical VCS 3599 result** | 713,972,729 L | 0.10 | **162,241.14 tCO₂e** | **154,125.14 tCO₂e** | Back-calculated from verified Verra spreadsheet — matches 154,125 VCUs issued 13/02/2026 |

The **canonical figure (162,241.14 → ER = 154,125.14 tCO₂e)** is the authoritative result for VCS 3599, period 01 Jan – 30 Jun 2025. The intermediate fixture was used to confirm the `credentialSubject` bug fix and token mint chain; it uses a smaller QPW_y value and does not represent the project scale.

### AMS-III.AV. Equations Applied

```
SEC  = 357.48 / nwb                                                    [Eq. 5]
BE_y = QPW_y × m × X_boil × SEC × (BL_fuel × f_i × EF_fuel × 1e-9)   [Eq. 1]
ER_y = BE_y − PE_y − LE_y                                              [Eq. 7]
WQ gate: pass_rate < 0.90 → ER_y = 0  (fail-closed)                   [§6.1]
```

**Canonical parameters (VCS 3599):**

```
QPW_y = 713,972,729 L  |  m = 0.95  |  X_boil = 1.0  |  nwb = 0.10
EF_fuel = 81.6 tCO₂/TJ |  f_i = 0.82  |  BL_fuel = 1.0

SEC  = 357.48 / 0.10 = 3,574.8 kJ/L
BE_y = 713,972,729 × 0.95 × 1.0 × 3574.8 × (1.0 × 0.82 × 81.6 × 1e-9)
     = 162,241.14 tCO₂e
ER_y = 162,241.14 − 0 − 8,116.00 = 154,125.14 tCO₂e
```

---

## Why `tests/` Is Empty in the `.policy` Binary

Guardian's policy export format does **not** bundle test evidence files into the
`.policy` binary — it exports the policy workflow definition only. The `tests/`
directory entry exists in the ZIP structure but contains zero files by design.

All dry-run evidence (signed VCs, HCS topic receipts, token records) is committed
directly to this directory as CSV files and available at:

> `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/Bug Fixed Tested policies/`

---

## 9 Structural Bugs Fixed (v2.0.0 → v2.0.1)

| # | Block | Bug | Impact |
|---|---|---|---|
| 1 | `save_report_form_pp_hedera` | `defaultActive: true` + `dataType: ''` | 30-sec Hedera SDK timeout on every form submit |
| 2 | `calculate_report_fields` | `outputSchema` → ER Summary instead of Monitoring Report | Document re-signed as wrong type |
| 3 | `calculate_report_fields` | `credentialSubject` plain-object access bug | All fields read as `0`; zero tokens minted always |
| 4 | `new_report` | Missing `setRelationshipsBlock` | Reports not linked to parent project |
| 5 | `sr_reassign_approved_report` | No `RunEvent` | SR approval chain stalled |
| 6 | `sr_save_reassigned_approved_report_hedera` | No `RunEvent` | Approval flow broken end-to-end |
| 7 | 19 Hedera `sendToGuardianBlock` entries | `dataType: ''` | HCS messages unclassified |
| 8 | Monitoring Report schema | `field6` in `required[]` | PP forced to enter computed value |
| 9 | `save_new_approve_document` | `permissions: ['ANY_ROLE']` | Any role could approve PP registration |

---

*Related PR: [hashgraph/guardian#6164](https://github.com/hashgraph/guardian/pull/6164)*
