# VM0010 - Free Models Router handoff

Prepared25 October2026. Read `PHASE3-CALCULATION-SPEC.md` first. This handoff records an implementation backlog; it does not authorize publication or changes to unresolved methodology interpretations.

## Workspace and preservation

- Repository: `C:\Users\User\Desktop\Engineering-Hub-Challenges\guardian`.
- Branch: `develop`; expected HEAD `089c1169872f9a2b1e2bcd9cee5b473ba63e1fb0`.
- Methodology directory: `Methodology Library/DLT Earth Methodology Bounty Program/VM0010 V1.4`.
- Bounty: [hashgraph/guardian#5941](https://github.com/hashgraph/guardian/issues/5941).
- Existing [PR7107](https://github.com/hashgraph/guardian/pull/7107) is an open six-file Equation(7) correction, not a full-methodology submission. Its head matches the expected local commit. Do not import full implementation work into that correction PR.
- The35 pre-Phase3 VM0010 files comprise7 tracked and28 untracked files. Phase2 changed tracked `README-slice.md` and `test/calculate-infra-812.test.mjs`, and the still-untracked `test/load-artifact.test.mjs`. The two Phase3 Markdown files are additional files. Preserve all of them.
- Recovery directory: `C:\Users\User\Desktop\Engineering-Hub-Challenges\guardian-vm0010-recovery-20261025T104536-42e8fc3f`. It contains verified before/after ZIPs, inventories and baseline state. Do not overwrite, move or delete these backups. Before ZIP SHA256: `a97960a586cd4d1aa134071ffc6564c1a7cd954ae60308ae80e86a596a68df93`; after ZIP: `72dd76b021892175f084de8006665d4c0f5c54504796f952c3749d81b900cfb9`.
- There are thousands of unrelated tracked line-ending differences and untracked ACM0010/CLEAR work. Do not reset, clean, restore, normalize line endings, stash wholesale, switch branches, create worktrees, or stage everything. Do not alter unrelated projects.
- No commits, pushes, PR submissions or external comments are authorized. This phase authorizes documents only; execute the backlog when the user authorizes implementation. A later explicit implementation request supplies that authorization. Preserve new/changed work in a fresh, non-overwriting snapshot when authorized.

## What already works

The slice has seven calculation blocks for numbered equations3/4,5,6,7,8,11,12/48; eight schemas; one Project Hub CUSTOM Project Description mapping; a zero-dependency policy builder; and eleven test files. That is nine distinct numbered equations, despite older notes saying eight. It is not a complete lifecycle policy.

Equation(7) must remain `V_notEX,INF * BCEF_R * CF_j`: BCEF_R positive with no cap at1, CF_j separately in `(0,1]`. `aHbJ` is not a methodology input. No existing calculation module is to be rewritten merely because the backlog names a neighboring module.

The focused Equation(7) tests read tracked source and schemas, and run without `VM0010.policy`. `_artifact.mjs` remains unchanged and its ZIP readers are strict. Full artifact tests still require the untracked policy and verify packaged/source expression identity and Equation(7) wiring. Do not add a missing-artifact fallback or a fabricated policy graph.

Baseline: **236 tests, 235 pass, 0 fail, 1 skip**. The skip is the optional AJV cross-check because AJV is unavailable. Phase2 and Phase3 added schema regressions, Eq (40)-(41), Eq (43)-(46), A01/A02/A03, Eq (1)-(2), Eq (16), Eq (30)-(32) and Eq (33)-(34) coverage while retaining all prior passing tests.

## Exact first implementation batch, after authorization

Work in small reviewable batches. Use the ledger's independent fixtures rather than computing expected results by calling the function under test. New module/schema/test files must be scoped to VM0010 and follow existing Guardian custom-logic conventions.

| Task | Exact scope | Acceptance criteria |
|---|---|---|
|1|T01: new typed/provenance input contracts for units, gas, scope, period, record keys and evidence.|Missing/NaN/infinite numbers reject; explicit percent conversion; required divisors positive; no implicit source or climate constant; existing schemas/tests unchanged unless a separately reviewed compatibility extension is required.|
|2|T02: `logic/calculate-plot-volume-811.js`, its output schema(s), `test/calculate-plot-volume-811.test.mjs`; equations1/2.|Tree sum10 m3; unequal-plot mean25 m3/ha; reject zero area/duplicate IDs; support more than three species/strata; no automatic allowable-harvest quota.|
|3|T04: `logic/calculate-fuel-factors.js`, `logic/calculate-non-co2-emission-factor.js`, corresponding schemas/tests; equations47/48 and A03.|Eq48 fixture2.676492 tCO2/kL; synthetic non-CO2 fixture0.3; explicit same activity denominator and GWP profile; detect MJ/TJ and L/kL errors; do not silently include a methane mass factor as CO2e.|
|4|T05: new `calculate-hauling-fuel-814.js`, `calculate-transport-fuel-814.js`, `calculate-processing-energy-814.js` and matching schemas/tests.|Implement14-21 exactly; fixtures0.5 tCO2e hauling,5/5.25 trips,500 km,0.625 transport,3000 kWh,1.5 grid emissions,20 kW generator,1.5 generator emissions. Separate branch selection, no double-counted energy, no invented chart interpolation or trip ceiling.|

Do not run `build-policy.mjs` merely to test these source kernels: it overwrites the existing artifact. Artifact integration/rebuild belongs to an explicitly authorized later batch after compatibility review.

## Subsequent dependency order

1. T03: source-prescribed infrastructure partition and optional BEF-density factor construction. Require evidence; do not modify existing3-8.
2. T06: project biomass sums29-31, matched-interval growth32 and fire34/33 with supplied approved allometry/COMF/GWP inputs.
3. T07: evidence gates, PMP ratio, explicit-factor LF weighting, no-leakage exemption evidence, raw uncertainty42 and no-deduction threshold; additionality route workflow. No invented CDM/statistical/finance algorithms.
4. T08: Equation9 kernel with verified explicit class-carbon inputs and supported factors. Reject missing active-other factors and volume-only conversion requests.
5. T09: pure signed/result kernels28,38-46 with explicit period contracts; keep disconnected from production issuance.
6. T10: general products, baseline aging/regrowth, non-fire and significant-illegal-logging derivations only after the specification's authority gates are resolved.
7. T11/T12: approved workflow/templates/Hub integration, real-case end-to-end evidence and documentation/demo.

## Hard stops and clarification ownership

The specification's B01-B12 table contains exact questions and affected dependencies. Route methodology ambiguities through maintainers to Verra/VVB; store actual approvals and numerical examples. Do not send messages or submit questions externally without user authorization.

| Stop | Do not invent | Can proceed independently |
|---|---|---|
|B01/B02|Automatic volume-share -> class-carbon mapping; missing `other` SLF/OF; corrected multiclass10/11.|Verified-input9 arithmetic, class-source validation and conservation diagnostics.|
|B03/B04|Repairs to repeated indices24-26, parcel scope13/23/27, regrowth time22/26 or cohort-year convention.|Plot means, unit conversions and isolated explicit-scope kernels.|
|B05/B11|Annual/cumulative reconciliation in40-46, fractional/incremental issuance, rounding, negative-result clamping, default NPR.|Pure arithmetic with explicit same-scope inputs; no token minting.|
|B06/B07/B08|A universal GWP, COMF default, alias for non-fire baseline C_AB, illegal-logging numerator/ratio/area aggregation.|Fire/growth kernels on verified explicit factors and stock inputs, and zero-logging evidence gates.|
|B09/B10|Relative-percent versus percentage-point leakage bands, uncertainty component estimator, current CDM tool formulas, arbitrary IRR/discount/sensitivity conventions.|Explicit-factor area weighting, raw RSS42, threshold/evidence checks and approved-indicator comparisons.|
|B12|An approved VM0050 export, finished VCS5/joint CCB schemas, SDVISta exclusion, or successful Hub delivery.|Independent calculations and template-neutral documentation.|

The source does permit class volumes/fractions in section6.2 and gross product-volume percentages on p.24. Do not repeat the earlier claim that class activity data has no authoritative pathway. It still does not supply a universal heterogeneous-species class-carbon conversion or fix the multiclass sum defects.

Fuel heating value is TJ/kg in Equation48. `43 MJ/kg =0.000043 TJ/kg`; existing synthetic inputs0.043 must not become realistic diesel defaults. Corrected Equation12 has no carbon-to-CO2 denominator. Baseline averaging was removed by the June2026 correction; do not use it to hide annual/cumulative discrepancies.

## Test commands

Run from the repository root. No dependency installation is needed for existing tests. Node24.19 was used for the established baseline. `--test-isolation=none` avoids Windows sandbox subprocess restrictions; ordinary `node --test` is suitable where subprocesses are permitted.

Focused standalone regression:

```powershell
node --test --test-isolation=none "Methodology Library/DLT Earth Methodology Bounty Program/VM0010 V1.4/test/calculate-infra-812.test.mjs"
```

Expected:9 pass,0 fail,0 skip, with no artifact/build dependency.

Full existing suite (PowerShell expands an explicit file list):

```powershell
$vmTests = @(Get-ChildItem -LiteralPath 'Methodology Library/DLT Earth Methodology Bounty Program/VM0010 V1.4/test' -Filter '*.test.mjs' -File | ForEach-Object FullName)
node --test --test-isolation=none @vmTests
```

Expected baseline:236 total,235 pass,0 fail,1 AJV skip. New meaningful tests may increase the count; existing passes must not disappear and the skip must not spread to new mandatory checks. Run targeted new tests first, then the full suite after a code batch. Do not claim native Guardian/Project Hub end-to-end validation from these offline tests.

Read-only state checks:

```powershell
git branch --show-current
git rev-parse HEAD
git --no-optional-locks status --short --untracked-files=all -- 'Methodology Library/DLT Earth Methodology Bounty Program/VM0010 V1.4'
git diff --check -- 'Methodology Library/DLT Earth Methodology Bounty Program/VM0010 V1.4'
```

## Required completion report for each code batch

Report exact files changed/created, ledger/task IDs implemented, independent numerical results, targeted/full regression results, unchanged branch/HEAD and backup verification, remaining blockers, and the next safe task. Never state that a printed but unresolved formula has been repaired or approved without evidence. Preserve Equation7 and the narrow PR scope throughout.
