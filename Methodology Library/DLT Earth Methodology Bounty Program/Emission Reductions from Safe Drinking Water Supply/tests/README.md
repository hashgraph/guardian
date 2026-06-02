# Test data — VMR0015 v1.0 (Verra VCS 3599)

This folder contains the canonical test fixture and the dry-run validation evidence for the policy.

## `VMR0015_VCS3599_monitoring_report.json`

A single Monitoring Report credential subject, grounded in a **real, registered Verra project** and using the real AMS-III.AV. parameters:

- **Project:** VCS 3599 — Grouped Projects for Safe Drinking Water for Schools in Viet Nam (Registered, methodology AMS-III.AV.)
- **Monitoring period:** 01/01/2025 – 30/06/2025
- **Registry:** https://registry.verra.org/app/projectDetail/VCS/3599

> The parameter values are **illustrative inputs** chosen to exercise the real AMS-III.AV. calculation at VCS 3599's scale. They have not been independently re-derived from the issuance/monitoring PDF; exact verified parameters can be substituted from the project's Verification Report if precise reconciliation is needed.

### Field mapping (Monitoring Report schema `#db884e2d`)
| Field | Meaning | Value |
|---|---|---|
| `field12` | `QPW_y` — safe water supplied (L/yr) | 200,000,000 |
| `field13` | `m` — fraction of functional appliances meeting SDW (0–1) | 0.95 |
| `field14` | `X_boil` — fraction whose baseline is boiling (0–1) | 1.0 |
| `field15` | `nwb` — baseline appliance efficiency (0–1) | 0.15 |
| `field16` | `EF_fuel` — fuel emission factor (tCO₂/TJ) | 81.6 |
| `field17` | `f_i` — fraction of non-renewable biomass / fNRB (0–1) | 0.30 |
| `field18` | `BL_fuel` — baseline fuel fraction (0–1) | 1.0 |
| `field10` / `field11` | Appliances passing WQ / total | 95 / 100 |
| `field4` | Project Emissions (PE) | 0 (passive purifier — no project combustion) |
| `field5` | Leakage (LE) | 0 |
| `field3` | Baseline Emissions (BE) | **0 on import** — computed by the policy |
| `field6` | Emission Reductions (ER) | **0 on import** — computed by the policy, then minted |

### Expected result after submission
The `calculate_report_fields` block computes (real AMS-III.AV. equations):
```
SEC  = 357.48 / 0.15                                                   = 2,383.2 kJ/L      [Eq.5]
BE_y = 2e8 * 0.95 * 1.0 * 2383.2 * (1.0 * 0.30 * 81.6 * 1e-9)          = 11,084.74 tCO2e   [Eq.1]
ER_y = 11,084.74 - 0 - 0                                               = 11,084.74 tCO2e   [Eq.7]
```
Appliance pass-rate = 95 / 100 = 0.95 ≥ 0.90, so the water-quality gate passes and the policy mints **11,084.74 CER**.

### Calculation branches (for reviewers)
The block has been exercised across these cases (logic-level), all behaving as expected:

| Input | Expected `field6` |
|---|---|
| Example fixture above (pass-rate 0.95) | 11,084.74 |
| Values supplied as numeric strings | 11,084.74 (coerced) |
| Appliances 85 / 100 (pass-rate 0.85 < 0.90) | 0 (water-quality gate fires) |
| Appliance counts missing/blank | 0 (fail-closed) |
| `nwb = 0` | 0 (SEC = 0 → BE = 0) |
| Net negative (PE + LE > BE) | 0 (clamped) |

## Dry-run validation evidence

This exact policy was imported into Guardian, dry-run, and **published** on a testnet instance.

| File | What it proves |
|---|---|
| `VMR0015_dryrun_record.record` | Guardian recording of the dry run. Its 17 project-schema IDs match this policy 17/17 (confirming the record belongs to this policy, not a stale export). |
| `VMR0015_dryrun_publish_proof.csv` | The signed `PUBLISH` Verifiable Credential (Ed25519 signature, Hedera testnet DID) emitted when the policy published, under the name `VMR0015 v1.0 Safe Drinking Water dMRV`, version 2.0.0. |

> The bundled `.record` was produced from a **live Guardian dry-run of this policy**, so it can be replayed deterministically against the same import. (An earlier AI-generated record that did not match this policy's schema IDs was removed.)

## Note on the water-quality gate
The calculation block implements AMS-III.AV.'s real requirement: emission reductions cannot be
claimed if **more than 10% of appliances fail** the water-quality requirement. The block reads the
appliance pass/total counts (`field10` / `field11`) and zeroes the period's ER when the pass-rate is
below 0.90. It is fail-closed: missing appliance evidence yields a pass-rate of 0 and therefore no issuance.
