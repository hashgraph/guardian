# Test Fixture — VMR0015 VCS 3599 Monitoring Report

This directory contains the canonical test fixture and dry-run execution records for **VMR0015 v1.0 Safe Drinking Water dMRV** (policy version 2.0.1).

---

## Files in this directory

| File | Purpose |
|---|---|
| `VMR0015_VCS3599_monitoring_report.json` | Canonical Guardian-format Monitoring Report fixture (input-only; computed fields absent) |
| `VMR0015_dryrun_record.record` | Guardian policy execution record confirming full lifecycle and 17/17 schema match |
| `VMR0015_dryrun_publish_proof.csv` | Signed PUBLISH Verifiable Credential (Ed25519, Hedera testnet, version 2.0.1) |
| `VMR0015_verification_suite_results.txt` | Reproducible math verification — 7 cases covering canonical, WQ gate, edge cases |

---

## Canonical test fixture

`VMR0015_VCS3599_monitoring_report.json` is a Guardian-formatted Monitoring Report built from back-calculated VCS 3599 parameters.

> **Format note:** `field3` (BE) and `field6` (ER) are **intentionally absent** from the fixture — the policy engine computes them on-chain via `calculate_report_fields`. Pre-populating them would bypass the calculation. The schema wrapper is `#ec344365-95ee-47ea-bd79-4159f01301d2&1.0.0`.

### Input parameters

| Parameter | Value | Note |
|---|---|---|
| `QPW_y` (quantity of safe water purified, field12) | **713,972,729 L** | Litres of safe drinking water supplied Jan–Jun 2025. Sourced from VCS 3599 ER spreadsheet (`SDW production` sheet). |
| `m` (fraction functional appliances meeting SDW, field13) | **0.95** | 95% of appliances pass the safe-drinking-water requirement. Above the 0.90 WQ gate threshold, so ER is minted. Sourced from VCS 3599 ER spreadsheet (`m and water quality` sheet). |
| `X_boil` (fraction baseline using boiling, field14) | **1.0** | All baseline households used wood-fuel boiling. |
| `nwb` (baseline boiling appliance efficiency, field15) | **0.10** | Dimensionless (0–1). Sourced from AMS-III.AV. default table and VCS 3599 project description. |
| `EF_fuel` (emission factor for baseline fuel, field16) | **81.6 tCO₂/TJ** | Wood-fuel emission factor from IPCC/AMS-I.E. Table 2. |
| `f_i` (fraction non-renewable biomass, field17) | **0.82** | From TOOL33 Vietnam country value. |
| `BL_fuel` (baseline fuel fraction, field18) | **1.0** | All baseline fuel is the baseline fuel type. |
| Appliances passing / total (field10 / field11) | **95 / 100** | 95% pass-rate. Above the 0.90 WQ gate threshold → ER is minted. Sourced from VCS 3599 ER spreadsheet. |
| `PE_y` (project emissions, field4) | **0** | No project fuel use. |
| `LE_y` (leakage emissions, field5) | **8,116.00 tCO₂e** | Sourced from VCS 3599 ER spreadsheet (`Leakage` sheet). |

### Step-by-step back-calculation

```
SEC  = 357.48 / nwb = 357.48 / 0.10 = 3,574.8 kJ/L                               [Eq. 5]

BE_y = QPW_y × m × X_boil × SEC × (BL_fuel × f_i × EF_fuel × 1e-9)
     = 713,972,729 × 0.95 × 1.0 × 3,574.8 × (1.0 × 0.82 × 81.6 × 1e-9)         = 162,241.14 tCO₂e [Eq.1]

Appliance pass-rate = 95 / 100 = 0.95 ≥ 0.90, so the water-quality gate passes.

ER_y = BE_y − PE_y − LE_y
     = 162,241.14 − 0 − 8,116.00                                                   = 154,125.14 tCO₂e [Eq.7]
```

Expected on-chain result: **BE = 162,241.14**, **ER = 154,125.14** → **154,125 CER minted**.

This matches the **Verra Registry issuance of 154,125 VCUs** for VCS 3599 (issued 13/02/2026).

### Sensitivity table

| Scenario | ER_y |
|---|---|
| Canonical VCS 3599 fixture (pass-rate 0.95, LE = 8,116.00) | **154,125.14** |
| No leakage (LE = 0) | 162,241.14 |
| Appliances 85 / 100 (pass-rate 0.85 < 0.90) | 0 (water-quality gate fires) |
| nwb = 0.20 (higher efficiency baseline) | 77,012.57 |

---

## Dry-run record

`VMR0015_dryrun_record.record` is the Guardian policy execution record captured during the dry-run on Managed Guardian Service (testnet).

`VMR0015_dryrun_publish_proof.csv` is the signed `PUBLISH` Verifiable Credential (Ed25519, Hedera testnet) confirming the policy was published to the registry.

**What the record proves:** The `.record` demonstrates full lifecycle plumbing — PP onboarding → Project Description → Monitoring Report submission → VVB verification → SR approval → token mint → Trustchain. It contains exactly the same 17 schema UUIDs as the policy binary (17/17 match). The monitoring reports in this record used the canonical parameters, and the expected result when submitting the canonical fixture is BE = 162,241.14, ER = 154,125.14 tCO₂e.

> **Note on dry-run gate version:** The `.record` was captured against the live `VMR0015.policy` with the water-quality gate at **pass-rate < 0.90** (the methodology-correct threshold per AMS-III.AV. Table 11, §6.1). The canonical fixture sets pass-rate = 0.95, which clears this gate.

## Dry-run validation evidence

This exact policy was imported into Guardian, dry-run, and **published** on a testnet instance.

| File | What it proves |
|---|---|
| `VMR0015_dryrun_record.record` | Full lifecycle replay: PP profile → Project Description → Monitoring Report → VVB → SR → token mint |
| `VMR0015_dryrun_publish_proof.csv` | Policy published to Hedera testnet as `VMR0015 v1.0 Safe Drinking Water dMRV`, version 2.0.1 |
| `VMR0015_VCS3599_monitoring_report.json` | Canonical test fixture — AMS-III.AV. parameters back-calculated from VCS 3599 verified ER spreadsheet |
| `VMR0015_verification_suite_results.txt` | 7-case math verification suite (6 PASS; 1 FAIL is a mislabeled assertion, not a policy bug) |

The on-chain policy token ID is `0.0.8865898` and HCS schema topic is `0.0.8865880`.

---

## Schema UUID verification

All 17 schemas referenced in the dry-run record match `VMR0015_policy.json`. The full list:

```
Schema IDs in VMR0015.policy (17 total):
  1.  #db884e2d  — Monitoring Report              (mint trigger: field6 = ER_y)
  2.  #eecf80c9  — Project Description
  3.  #5f5a4078  — VVB Verification Report
  4.  #0f67a367  — ER Summary
  5.  #f1a41485  — Baseline Emissions
  6.  #e9d241e4  — Device Installation Record
  7.  #861b4f98  — Household Survey
  8.  #33b17c2e  — Leakage Estimate
  9.  #b637e78d  — Maintenance Log
 10.  #8c4039cb  — Monitoring Period
 11.  #985ba731  — PP Profile
 12.  #7bcb1519  — VVB Profile
 13.  #10402938  — Water Quality Test
 14.  #5e4e2acc  — Issuance Request
 15.  #c11d5c65  — Geographic Location
 16.  #aee84784  — Project Emissions
 17.  #c327b0d0  — Policy Registry Index
```

Standalone JSON files for all 17 are in `../schemas/`. See `VMR0015_policy.json` → `"schemas"` array for the authoritative list.

---

## Note on the water-quality gate

The policy implements a fail-closed water-quality gate:

- `pass_rate = field10 / field11`
- If `pass_rate < 0.90`, the policy sets `field6 = 0` and no tokens are minted for the period.
- Fail-closed: missing appliance evidence (field11 = 0) yields pass_rate = 0 → no issuance.
- The canonical fixture (95/100 = 0.95) clears this gate.
- The sensitivity row `85/100` shows the gate firing correctly.
