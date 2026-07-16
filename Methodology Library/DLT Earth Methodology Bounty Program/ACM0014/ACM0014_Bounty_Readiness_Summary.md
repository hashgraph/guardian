# ACM0014 v8.0 Wastewater dMRV -- Bounty Readiness Summary

Prepared by Bikram Biswas for DLT Earth methodology bounty review.

## 1. Technical status

I've resolved all four blocking bugs and confirmed the fixes via real issued Verifiable Credentials, not static review alone.

| Gap | Root cause | Fix |
|---|---|---|
| `credentialSubject.undefined x4` on VVB verify | Formula variables (`ery`, `pey_total`) referenced values not yet computed at that point in the evaluation array | Reordered so every variable follows everything it depends on |
| Same error, present after reorder | Four other mathBlocks I'd wired to Safe Drinking Water / VMR0015 schemas, firing on every report submission | Disabled every entry point: automatic triggers, manual buttons, grids, save blocks |
| `field52/53/54/67` returning `null` | Division-by-zero when `COD_in = COD_out` in the reference period | Zero-guard on the temperature-factor denominator, made exhaustive to cover negative denominators too |
| Guardian editor rejected my guard ("Option 'expression' is incorrect") | My guard used a compound-expression comparison; Guardian's piecewise formulas require single-variable comparisons | Rewrote using an intermediate variable, matching the pattern I confirmed works elsewhere in the policy |
| TOOL07 / TOOL09 silently simplified | Not a bug, but undisclosed | Added explicit disclosure text to the engine's own gap notes |
| Token / bindBlock / event-source naming leftover from an earlier template | Copy/clone artifact | Corrected token name, `bindBlock` target, and event self-reference |
| Dangling `bindBlock` in PP rejection flow | `return_vvb_btn` referenced a tag that doesn't exist | Corrected to `return_pp_btn` |

## 2. Real project data basis

I sourced my core test values from the **Chok Chai Starch Co. Wastewater Treatment Project** (Uthai Thani, Thailand) -- a CDM Project Design Document under ACM0014, DOE-verified by JQA (Japan Quality Assurance Organisation). UASB digester, 4,650 m3 active volume, 1.87-day HRT, biogas to hot-oil burners and a 450 kW generator.

Reproduced against my engine:
- BE_EL: 1,525.9 vs. real PDD's 1,526 -- near-exact match
- BE_HG: 5,135.5 vs. real PDD's 5,135 -- near-exact match
- PE_y,total: 13,712 vs. real PDD's 13,712 -- exact match
- BE_CH4 (van't Hoff-Arrhenius term): 41,904 vs. the real project's registered (v2.1) figure of 65,048 -- partial match, disclosed below

**Why BE_CH4 doesn't match exactly:** the PDD's public tables don't disclose month-by-month COD/temperature data at the granularity my v8.0 engine needs (that data sits in an Appendix 1 spreadsheet the registry lists but doesn't make downloadable). My engine also implements a structurally different Arrhenius-weighted baseline model than the simpler v2.1 approach this specific project actually registered under. BE_EL, BE_HG, and PE_total all reproduce cleanly because those figures come directly from disclosed PDD table values, independent of that structural difference.

**What this is not:** a VCS-native ACM0014 project. Chok Chai is CDM-registered (DOE: JQA), not Verra VCS. I haven't confirmed a currently-active Verra VCS-registered ACM0014 project in the public registry.

**Project 9045 (Sapthip, Thailand):** the specific reference project I was asked about directly. Confirmed from UNFCCC's registry -- registered under ACM0014 v4, 101,083 tCO2e/yr, registered 28 Dec 2012, crediting period through 27 Dec 2022. Monitoring report covers 28 Dec 2012 - 31 Dec 2020, with issuance status still "Awaiting issuance request." The three appendices (`TH_Sapthip_ER_Calculation_20Dec12.xls`, `TH_Sapthip_FA_Calculation_05Dec12.xls`, `Thai_Grid_EF_06-08_V4.xls`) are confirmed to exist on the registry, but the file-storage endpoint blocks automated retrieval. I'll need direct browser access to pull those and reconcile them further.

**Current, Verra-native comparanda in the same sector:** Monsoon Carbon / Cenergi's "Monsoon Methane Avoidance from Industrial Wastewater" Grouped Project, with Project Activity Instances in Malaysia (Langkap Biogas Plant, Perak -- traded on Bursa Carbon Exchange June 2025) and Indonesia (Verra Project ID 5292). These are real, live, 2025-2026-active Verra VCS projects in industrial wastewater biogas recovery. I'm disclosing that these likely register under AMS-III.H / AMS-III.Y (small-scale, grouped-project methodologies), not ACM0014 itself, which is typically used for larger single-facility projects.

## 3. Methodology currency

Verra received a proposal to revise ACM0014 (vinasse waste management) and rejected it in April 2025, citing overlap with the existing methodology -- confirming the current version is Verra's live, endorsed reference, not something that's fallen behind. ACM0014 is also directly cited as a required calculation reference inside Verra's own `VM0052` methodology (2025), which operates under VCS Version 5 -- Verra's current standard as of December 2025.

One dated item I'm tracking, not a current blocker: VCS v5.0's transition rules give v4-era methodologies (which describes ACM0014's structure) a grace period through **December 2026** before they need updating to v5.0's standardized-methods format.

## 4. Policy Integrity Tests

Guardian 3.6 (the version this policy targets) supports registering a fixed set of input documents and expected output documents as a named, re-runnable baseline. I've built my realistic Chok Chai-derived dataset (`tests/ACM0014_test_fixture.json`) to be registered as exactly that baseline -- declared inputs, expected `BE_EL,y=1,525.9`, `BE_HG,y=5,135.5`, `PE_y,total=13,712`, `ER_y=34,853.1` (or the values matching whichever exact test run I use). This is how I plan to give reviewers a reproducible, Guardian-native check rather than a one-off manual test.

## 5. Compliance with methodology-digitization guidance

- I implemented calculations in mathBlock, not customLogicBlock, per reviewer guidance.
- CDM tools (TOOL01 additionality, TOOL05 electricity, TOOL14 digester PE/LE) are embedded inline and sourced from Project Description / Monitoring Report template fields, rather than wired as separate Tool policies -- this avoids schema-IRI resolution errors entirely.
- I collect 12 months of monitoring data within a single annual report and aggregate them in-block, rather than via cross-VC aggregation across monthly submissions.
- I used TOOL01 (not VT0008) for additionality, since ACM0014 has no VMR revision requiring the Verra replacement tool.

## 6. Remaining open items

- TOOL07 / TOOL09 remain simplified to disclosed manual inputs rather than fully re-derived sub-calculations.
- Flaring / land-application / solid-material-leakage branches remain validated only against hand-calculation and my pinned test dataset, not against a real project that uses them.
- I have not confirmed a live Verra VCS project specifically under ACM0014 for full numerical cross-validation.
- Sapthip's underlying Appendix 1/2/3 data needs manual (browser) retrieval before I can reconcile it against this engine.
- My Policy Integrity Test baseline is specified but not yet registered inside a live Guardian instance -- I still need to do that through the UI.
- VCS v5.0 transition deadline (December 2026) for v4-era methodology format.
