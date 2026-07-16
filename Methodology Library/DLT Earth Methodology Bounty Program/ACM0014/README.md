# ACM0014 v8.0 Treatment of Wastewater dMRV (Policy C) -- Bounty Submission

Submitted by Bikram Biswas for the DLT Earth methodology bounty.

## Contents

| Path | Purpose |
|---|---|
| `policy/ACM0014_v8_0_Policy_C_BOUNTY_SUBMISSION.policy` | Final policy file. Import directly into Guardian. |
| `policy/policy.json` | Raw policy JSON, for readable diffs. |
| `tests/ACM0014_test_fixture.json` | My working test dataset with expected outputs and a specific negative-case test noted. |
| `tests/ACM0014_Policy_Integrity_Test_baseline.json` | Guardian 3.6 Policy Integrity Test specification. See the caveat at the top of the file before use. |
| `tests/ACM0014_Monitoring_Report_Realistic_Test_Data.md` | Full derivation of my test fixture's numbers against the real Chok Chai Starch Co. project, with source citations. |
| `docs/PR_ACM0014_Policy_C_fixes.md` | Full PR description. |
| `docs/ACM0014_Bounty_Readiness_Summary.md` | Reviewer-facing summary: real-project data provenance, methodology-currency, and disclosed open items. |
| `.github/PULL_REQUEST_TEMPLATE.md` | Same PR description, placed for GitHub's auto-populate convention. |
| `PR_INSTRUCTIONS.md` | Commands for pushing this branch and opening the PR. |

## What I fixed

- Formula evaluation order in the core emissions engine (mint field and two intermediate variables were referencing values not yet computed).
- Four dead, wrong-methodology blocks that fired on every report and broke VVB verification -- fully quarantined at every entry point.
- Division-by-zero in the temperature-factor calculation, now handles zero and negative denominators gracefully.
- A dangling UI reference in the report-rejection/resubmit flow.
- Full plain-language rewrite of all 91 Monitoring Report fields for reviewer readability, with zero changes to field names, order, or types.

## Real-project data basis

I derived my test values from the Chok Chai Starch Co. wastewater treatment project (Thailand, CDM/ACM0014, DOE-verified). BE_EL, BE_HG, and PE_y,total reproduce the real project's disclosed figures to within rounding; BE_CH4 is a realistic reconstruction using the same digester physical specs, which I'm disclosing as a partial match since the real project's month-by-month COD/temperature data isn't publicly available at the granularity my engine needs.

Project 9045 (Sapthip, Thailand) is confirmed real and registered under ACM0014 v4 (101,083 tCO2e/yr), but its underlying calculation spreadsheets are blocked from automated retrieval by the UNFCCC registry's own robots policy -- I'll need to download those manually through a browser to reconcile them further.

## Test evidence

I ran two independent, complete lifecycle tests -- submit, VVB verify, mint -- with zero `credentialSubject.undefined` errors, each cross-checked by hand against the formula chain and matching to the last available decimal:

| Run | BE_y,total | PE_y,total | ER_y (mint field) | Minted amount |
|---|---|---|---|---|
| 1 | 32,856.46 | 452.11 | 32,384.347205130754 | 32384.34 |
| 2 | 33,228.40 | 408.74 | 32,799.65905950902 | 32799.65 |

## Known, disclosed limitations

- TOOL07 and TOOL09 remain simplified to manual inputs rather than full sub-calculations.
- Flaring, land-application, and solid-material-leakage branches are validated against hand-calculation and my test fixture, not yet against a real project that uses them.
- I have not located a standalone Verra VCS-native ACM0014 project for full numerical cross-validation. ACM0014 itself is confirmed current and Verra-endorsed (cited directly in Verra's own 2025 VM0052 methodology under VCS v5.0).
- VCS v5.0 transition rules give v4-era methodologies (which describes ACM0014's structure) a grace period through December 2026.
- My Policy Integrity Test baseline is specified in this package but not yet registered inside a live Guardian instance.
