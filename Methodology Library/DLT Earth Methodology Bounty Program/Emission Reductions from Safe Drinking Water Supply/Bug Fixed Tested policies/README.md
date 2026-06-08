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
| `6a2463dfd2866ba70ad193bd.csv` | CSV | Signed **policy PUBLISH VC** — confirms v2.0.1 live on Hedera testnet (`operation=PUBLISH`, issuer: SR DID `6VhJ5QVj…`) |
| `6a2465a6b475dc170fabd478.csv` | CSV | **PP role credential** — PP-submitted (step 1), issuer DID: `DBMsJGyJ…` |
| `6a2465aab475dc170fabd483.csv` | CSV | **PP role credential** — SR-countersigned (step 2), issuer DID: `6VhJ5QVj…`, 61 s later |
| `6a2466efb475dc170fabd4ac.csv` | CSV | **Project Description VC** — PP-submitted (fields: projectId, projectName, methodology, creditingPeriod, estAnnualER, totalHouseholds; dry-run placeholder values) |
| `6a2466f2b475dc170fabd4b4.csv` | CSV | **Project Description VC** — SR-countersigned (same inner `credentialSubject.id` as above — same Guardian document, two role signatures) |

---

## Version Confirmation

The signed PUBLISH VC (`6a2463dfd2866ba70ad193bd.csv`) contains:

```
credentialSubject.version   = "2.0.1"
credentialSubject.name      = "VMR0015 v1.0 Safe Drinking Water dMRV_1780769708120"
credentialSubject.operation = "PUBLISH"
issuer = did:hedera:testnet:6VhJ5QVjq4D48CzyxBfA2S4yXqW2ELMYhuEKJxfRcbLW_0.0.9124164
proof.type = Ed25519Signature2018
```

This confirms the `.policy` binary in this directory is **v2.0.1**.

---

## Canonical Calculation Results — VCS 3599 (2025H1)

Canonical input parameters (back-calculated from VCS 3599 ER spreadsheet):

| Parameter | Value | Unit |
|---|---|---|
| QPW_y | 713,972,729 | L/yr |
| m | 0.95 | dimensionless |
| X_boil | 1.0 | dimensionless |
| nwb | 0.10 | dimensionless (efficiency fraction, 0–1) |
| EF_fuel | 81.6 | tCO₂/TJ |
| f_i (fNRB) | 0.82 | dimensionless |
| BL_fuel | 1.0 | dimensionless |
| PE_y | 0 | tCO₂e |
| LE_y | 8,116.00 | tCO₂e |

### AMS-III.AV. Equations Applied

```
SEC  = 357.48 / nwb = 357.48 / 0.10 = 3,574.8 kJ/L               [Eq. 5]
BE_y = QPW_y × m × X_boil × SEC × (BL_fuel × f_i × EF_fuel × 1e-9)
     = 162,241.14 tCO₂e                                            [Eq. 1]
ER_y = BE_y − PE_y − LE_y = 154,125.14 tCO₂e                      [Eq. 7]
WQ gate: pass_rate 0.95 ≥ 0.90 → credits NOT zeroed                [§6.1]
```

**Canonical result: BE = 162,241.14 · LE = 8,116.00 · ER = 154,125.14 tCO₂e**  
Matches Verra Registry issuance for VCS 3599, 13/02/2026 ✅

### Note on the Intermediate Dry-Run Fixture (53,309.84 tCO₂e)

An earlier intermediate dry-run used QPW_y ≈ 23M L and nwb = 357.48 (a mis-entry
used only to test the token mint chain at reduced scale). It produced an
illustrative figure of 53,309.84 tCO₂e. That run confirmed the `credentialSubject`
bug fix and token mint chain were operational. It does not represent the VCS 3599
project scale. The canonical figure is **154,125.14 tCO₂e**.

---

## Why `tests/` Is Empty in the `.policy` Binary

Guardian's policy export format does **not** bundle test evidence files into the
`.policy` binary — it exports the policy workflow definition only. The `tests/`
directory entry exists in the ZIP structure but contains zero files by design.

All dry-run evidence (signed VCs, HCS topic receipts, token records) is committed
directly to this directory as CSV files.

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
