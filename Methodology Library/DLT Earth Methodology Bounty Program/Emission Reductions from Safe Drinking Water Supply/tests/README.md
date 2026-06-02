# Test data — VMR0015 v1.0 (Verra VCS 3599)

This folder contains the canonical test fixture for the policy.

## `VMR0015_VCS3599_monitoring_report.json`

A single Monitoring Report credential subject, grounded in a **real, registered Verra project**:

- **Project:** VCS 3599 — Grouped Projects for Safe Drinking Water for Schools in Viet Nam (Registered, methodology AMS-III.AV.)
- **Monitoring period:** 01/01/2025 – 30/06/2025
- **Registry:** https://registry.verra.org/app/projectDetail/VCS/3599

> The baseline-emissions value (154,125 tCO₂e) is an **illustrative input** drawn from the project's public registry record. It has not been independently re-derived here from the issuance/monitoring PDF; the exact verified figure can be substituted from the project's Verification Report if precise reconciliation is needed.

### Field mapping (Monitoring Report schema `#31d7ef1c`, flat)
| Field | Meaning | Value |
|---|---|---|
| `field3` | Baseline Emissions (BE) | 154125 |
| `field4` | Project Emissions (PE) | 0 (passive purifier — no project combustion) |
| `field5` | Leakage (LE) | 0 |
| `field6` | Emission Reductions (ER) | **0 on import** — computed by the policy |

### Expected result after submission
The `calculate_report_fields` block computes:
```
field6 = (field3 − field4 − field5) × 0.89 = (154125 − 0 − 0) × 0.89 = 137,171.25 tCO₂e
```
This matches VMR0015 §3.9.1 (`ER = BE − PE − LE`). The ×0.89 factor is a conservativeness
choice of this policy implementation (see README §2), not a Verra-mandated parameter.

### Calculation branches (for reviewers)
The block has been exercised across these cases (logic-level), all behaving as expected:

| Input | Expected `field6` |
|---|---|
| `field3=154125, field4=0, field5=0` | 137,171.25 |
| Values supplied as numeric strings ("154125") | 137,171.25 (coerced) |
| `field3=30399, field4=0, field5=1520` | 25,702.31 |
| Net negative (PE+LE > BE) | 0 (clamped) |
| Optional WQ pass-rate supplied at 90% (< 95%) | 0 (gate zeroes ER) — only if a pass-rate field is added to the schema |
| Optional WQ pass-rate supplied at 98% (≥ 95%) | normal ER — only if a pass-rate field is added to the schema |
| `field3` missing/blank | 0 |

## Note on the policy-integrity-test (`.record`)
No `.record` file is included. A valid integrity-test record must be produced from a
**live Guardian dry-run** of this policy so it can be replayed deterministically. An earlier
AI-generated record did not match this policy's block tags/schema IDs and was removed.

## Note on the WHO water-quality gate
The calculation block contains an optional WHO water-quality gate keyed on a `field10`
pass-rate (or a `wqSamples` array). The current Monitoring Report schema does **not**
expose `field10`, so the gate is dormant on a standard report — it is wiring kept ready
for a future schema revision that captures water-quality sampling.
