# fix(ACM0014): resolve engine evaluation bugs, quarantine dead cross-methodology blocks, add public-facing documentation

## Summary

I'm fixing four bugs in my ACM0014 v8.0 Treatment of Wastewater dMRV policy ("Policy C") that were causing `credentialSubject.undefined` JSON-LD validation failures during VVB report verification, correcting a dangling UI reference in the rejection/resubmit flow, and rewriting the Monitoring Report schema in plain language for reviewer readability.

## Root causes and fixes

**1. Formula evaluation order (`acm0014_tool14_engine`)**
Guardian's mathBlock evaluates formula variables strictly in array order, not by dependency graph. I had `ery` (the mint-value field) referencing `bey_total`, `pey_total`, `ley_total` -- all defined later in the array. `pey_total` referenced `peflare`, also defined later. Both were silently left as unevaluated formula text (e.g. `field55: "max(0, \"bey_total\" - ...)"`) instead of numbers, which corrupted the credential's declared `number` type.
*Fix:* I reordered the formula array so every variable follows everything it depends on. Confirmed zero forward-reference violations across all 65 formula entries; `field55`/`field79` now return real floats in issued VCs.

**2. Four dead, mis-schemaed blocks firing on every report submission**
`acm0014_baseline_emissions_math`, `acm0014_project_emissions_math`, `acm0014_leakage_estimate_math`, `acm0014_er_summary_math` were empty mathBlock shells I'd left wired to Safe Drinking Water / VMR0015 schemas (`fNRB Fraction`, `householdRef`) -- leftover cross-contamination from another policy, not ACM0014 fields. All were `defaultActive: true`, firing automatically via `set_*_relationship` blocks on every report, with independent manual "Add" buttons/grids/save blocks that bypassed the automatic trigger entirely.
*Fix:* I disabled every entry point -- the four relationship-trigger events, the four manual buttons, their grids, and their save blocks. ACM0014's BE/PE/LE/ER calculation is fully self-contained in `acm0014_tool14_engine` and unaffected.

**3. Division by zero in the temperature-factor formula (`fTy`)**
`fTy`'s denominator is zero whenever `COD_in = COD_out` in the reference period -- exactly the condition Guardian's dry-run placeholder auto-fill produces by default. My first guard attempt only covered `denominator = 0` and `denominator > 0`, missing the case where `COD_out > COD_in`.
*Fix:* I made the guard exhaustive -- `codblsum > 0` -> real calculation, `codblsum <= 0` -> `0`, via an intermediate variable so the comparison stays single-variable (Guardian's editor rejects compound-expression conditions in piecewise formulas).

**4. Dangling `bindBlock` in the PP rejection flow**
`pp_rejected`'s `bindBlock: "return_vvb_btn"` pointed at a tag that doesn't exist. The real sibling button is `return_pp_btn`.
*Fix:* corrected. I found this via a full structural sweep -- every `bindBlock` and event `source`/`target` checked against the actual set of block tags; zero dangling references remain anywhere in the policy.

**5. Public-facing schema documentation**
The Monitoring Report schema (91 fields) had notation-only titles (e.g. "COD_dig,m Eq.10").
*Fix:* every title now leads with plain English plus a numbered section tag (`[3. Monthly Digester Flow]`, `[6. Electricity Emissions]`, etc.), and every description explains what the field is and why it matters. The mint field is explicitly labeled `[Computed -- This Is What Gets Minted]`. I didn't change any field names, order, or types.

## Testing evidence

I ran two consecutive full lifecycle tests (submit -> VVB verify -> mint) on live Guardian dry-run instances:

| Run | BE_y,total | PE_y,total | ER_y (mint field) | MintToken amount | Match |
|---|---|---|---|---|---|
| 1 | 32,856.46 | 452.11 | 32,384.347205130754 | 32384.34 | exact |
| 2 | 33,228.40 | 408.74 | 32,799.65905950902 | 32799.65 | exact |

I re-derived both by hand against the formula chain and they matched to the last available decimal. No `credentialSubject.undefined` errors on either run.

I also confirmed: zero `customLogicBlock` usage (mathBlock only); zero Gold Standard / VMR0015 / AMS-III.AV contamination; TOOL01-based additionality intact (`Baseline Scenario and Additionality Justification` schema), since ACM0014 has no VMR revision -- Verra rejected a proposed revision in April 2025, citing overlap with the existing methodology. ACM0014 is directly cited as a required calculation reference in Verra's own `VM0052` methodology (2025, VCS v5.0), which confirms it's aligned with Verra's current standard.

## Real-project data basis

I derived my test values from the Chok Chai Starch Co. wastewater treatment project (Uthai Thani, Thailand) -- a CDM Project Design Document under ACM0014, DOE-verified by JQA. Reproduced against my engine:

- BE_EL: 1,525.9 vs. real PDD's 1,526
- BE_HG: 5,135.5 vs. real PDD's 5,135
- PE_y,total: 13,712 vs. real PDD's 13,712 (exact)
- BE_CH4: partial match only, disclosed below

I also looked into Project 9045 (Sapthip, Thailand), the specific reference project the team asked about. It's registered under ACM0014 v4 at 101,083 tCO2e/yr. Its underlying Appendix 1/2/3 spreadsheets exist on the UNFCCC registry but are blocked from automated retrieval by the registry's own robots policy -- I'll need to pull those manually through a browser to reconcile them further.

## Known, disclosed limitations

- TOOL07 (grid emission-factor build/operating-margin calculation) and TOOL09 (baseline thermal efficiency) are simplified to direct monitored inputs rather than fully re-derived sub-calculations.
- Flaring, land-application, and solid-material-leakage branches are validated against hand-calculation and my included test fixture, not yet against a real project that exercises them.
- BE_CH4 (the van't Hoff-Arrhenius term) reproduces Chok Chai's physical digester specs (volume, HRT, flow) but not its exact registered figure -- the PDD's public tables don't disclose month-by-month COD/temperature data at the granularity my v8.0 engine needs, and v8.0's Arrhenius-weighted baseline model is structurally different from the simpler v2.1 approach that project actually registered under.
- I haven't located a standalone Verra VCS-native ACM0014 project for full numerical cross-validation.
- Verra's VCS v5.0 transition gives v4-era methodologies (which describes ACM0014's structure) a grace period through December 2026 before they need updating to v5.0's standardized-methods format.

## Files changed

- `policy.json` -- formula ordering, guard logic, dead-block quarantine, `bindBlock` fix
- `schemas/*.json` (Monitoring Report) -- plain-language field titles/descriptions

## Recommended follow-up (non-blocking)

I'd like to register this policy as a Guardian 3.6 Policy Integrity Test baseline using my included test fixture, so the fix is verifiable via Guardian's own regression harness rather than manual review alone.
