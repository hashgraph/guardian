# Test data — VMR0015 v1.0 (Verra VCS 3599)

This folder contains the canonical test fixture for the policy.

## `VMR0015_VCS3599_monitoring_report.json`
A single Monitoring Report credential subject, grounded in a **real, registered Verra project**:

- **Project:** VCS 3599 — Grouped Projects for Safe Drinking Water for Schools in Viet Nam (Registered, methodology AMS-III.AV.)
- **Monitoring period:** 01/01/2025 – 30/06/2025
- **Verified net ER for the period:** ~154,125 tCO2e
- **Registry:** https://registry.verra.org/app/projectDetail/VCS/3599

### Field mapping (Monitoring Report schema #8d8b1014, flat)
| Field | Meaning | Value |
|---|---|---|
| field3 | Baseline Emissions (BE) | 154125 |
| field4 | Project Emissions (PE) | 0 (passive purifier) |
| field5 | Leakage (LE) | 0 |
| field6 | Emission Reductions (ER) | **0 on import** — computed by the policy |

### Expected result after submission
The `calculate_report_fields` block computes:
```
field6 = (field3 - field4 - field5) * 0.89 = (154125 - 0 - 0) * 0.89 = 137171.25 tCO2e
```
This matches VMR0015 §3.9.1 (ER = BE − PE − LE) with the policy's u_def = 0.89 conservativeness factor applied.

## Note on policy-integrity-test (.record)
No `.record` file is included. A valid integrity-test record must be produced from a **live Guardian dry-run** of this policy so it can be replayed deterministically. The earlier AI-generated record did not match this policy's block tags/schema IDs and has been removed.
