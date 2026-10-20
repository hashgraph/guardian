# VMR0015 v1.0 Safe Drinking Water dMRV: v3.1 package

A Hedera Guardian policy for Verra **VMR0015 v1.0**, the revision of CDM **AMS-III.AV v09.0** (low-GHG safe drinking water production systems).

It covers the full chain:
- PP and VVB accounts
- Project Description
- VVB validation and registry registration
- Monitoring Report, with the ex-post calculation
- VVB verification
- VCU issuance

Prepared by Bikram Biswas for the DLT Earth Methodology Bounty. v3.1 builds on the v3 policy (MGS id `6aca81f672c7fd6f74f88f61`).

## Contents

| Path | What it is |
|---|---|
| `policy/VMR0015_Safe_Drinking_Water_dMRV_v3.1_VCS-v5.0A_with_integrity_test.policy` | **Policy for projects starting before 1 Jan 2027** (VCS v5.0A templates), exported from MGS with its Policy Integrity Test (100 %). sha256 `5d22de23fe65b9028f552b533035c8eb2aa349bf73fd9903543ec27d01eaa2f2` |
| `policy/VMR0015_Safe_Drinking_Water_dMRV_v3.1_VCS-v5.0B_with_integrity_test.policy` | **Policy for projects starting on or after 1 Jan 2027** (VCS v5.0B templates), exported from MGS with its Policy Integrity Test (100 %). sha256 `18b50f669d62ca7df9bae418641938fa7290c2d64cd6245de7393277adbaaa88` |
| `policy/without_integrity_test/` | The same two policies as built, before the MGS import: A sha256 `fcdd6964647028c3ae7082947dc215ec543b24fa3769b2bbcf4f67c7b4867d07`, B `6c5031eb263e46c9a7afb60de78b61a337f189264cb748060f9f1374dc5451ab`. The `tools/` checks run on these |
| `evidence/mgs_round4/` | The two MGS recordings the integrity tests were made from |
| `reference/schema_excel/` | Every schema of each file as Guardian's own Excel export (one sheet per schema: field, type, required, description), for reading the forms against the Verra templates |
| `docs/MGS_ROUND4_RESULTS.md` | **MGS results** and the check that each export is the policy as built, plus its test |
| `docs/FORM_FILLING_GUIDE.md` | **Start here.** 15 steps, who does what on which page, and the number to check after each step |
| `sample-data/v5.0B/`, `sample-data/v5.0A/` | One sample document per form (PP, VVB, PD, MR, Validation Report, Verification Report, VCU request) for each file. Same project data; only the template sections differ |
| `tools/` | Checks anyone can re-run (below): `regression.py`, `guardian_math/` (Guardian's own math engine and the offline workflow replay), `audit/` (block and template checks), the sample generator, `template_build/` (how the Verra template tables were added) and `template_check/` (the label-by-label results) |
| `docs/MGS_CHECKS_RUNBOOK.md` | **Step-by-step MGS checks**: clicks and API calls for the refusal checks, the recordings and the Policy Integrity Test. Extra samples in `sample-data/v5.0B/mgs_checks/` |
| `docs/VM0047_AND_TEAM_REQUIREMENTS.md` | Measured comparison with VM0047, every team requirement with its status, and what is checked by the tools and what still needs a person to check |
| `docs/REAL_DATA_TEST.md` | **Real-data test**: a verified AMS-III.AV project (Nazava GS4290, 28,879 t verified) run through the policy's engine, with public source links |
| `docs/GAP_CLOSURE.md` | **Every open review finding: closed, or the reason it is not**, and the checks after the change |
| `reference/` | Bounty Q&A compliance (`TEAM_QA_COMPLIANCE.md`), the validator warnings explained (`VALIDATOR_WARNINGS.md`) and the equation-by-equation methodology trace (`METHODOLOGY-TRACE.md`) |

## The policy in numbers

| Item | Value |
|---|---|
| Blocks | 219, all with descriptive tags (172 share VM0047's tags) |
| Calculation | 2 mathBlocks (PD ex-ante, MR ex-post) hold every calculation, with 14 declared formulas and 18 (PD) / 19 (MR) declared formula functions for the core equations, and 25 field links. 5 customLogicBlocks only check (monitoring-period overlap twice, project ID unique, no re-opening, no second issuance) and calculate nothing |
| Schemas | v5.0A file 478, v5.0B file 411 (3 row tables added for TOOL03 / VT0010 per fuel, load and plant); in each, all used and none duplicated: the 7 form schemas and the ERR output, that template set's sections, sub-sections and table rows (103 and 85 of them added in change 23 for Verra's tables) and the VMR0015 Appendix 2 parameter tables. VM0047 has 530. Guardian's 14 standard system schemas are not counted |
| Roles | Project Proponent, VVB; Standard Registry = policy owner |
| Token | VCU VMR0015, non-fungible, 0 decimals (as in VM0047) |
| Validator | 0 errors expected; 184 reachability notes by `tools/reach.py` (179 confirmed by Guardian's validator on an earlier build; +2 for the prechecks inside their forms, +3 for the new checks) (see `reference/VALIDATOR_WARNINGS.md`) |

**What the engines implement:**

| Source | What is digitised |
|---|---|
| VMR0015 | Eq.(1) with the CO2 / non-CO2 split, Adj_LE (s8.3), fNRB options (s9.2) |
| AMS-III.AV | Eq.(2)–(5), the para 18 cap pro-rated by days, table 10 sample metering scaled to the section, tables 11, 13 (from the date of supply) and 14 |
| CDM TOOL03 | Options A and B, Eq.(1) summed over fuels i and sources j (dedicated generators, VT0010 Scenario D, entered here) |
| VT0010 v1.1 | Eq.(5), (7)–(9) per grid load, Eq.(11) per shared plant, Eq.(13)–(14) over each plant's fuels with cogeneration |
| CDM Sampling Standard v09.0 and Guideline v04.0 | Minimum 30, 90/10 target, para 18 discount in survey years 1–2 only |
| VT0008 | Step 4 common practice (F = 1 − N_diff/N_all), the Step 3 benchmark test and the WACC (A2.3 eq.(1)) against the benchmark are checked and flagged |
| VMR0015 s8.1 and s9.3 | η_wb as the usage-weighted average of the baseline boiling devices (footnote 3) and X_boil from the baseline-survey rows, when the PD records them; computed per section where the section has its own survey rows (s9.3(2)); the interactive-effects share applied proportionally, BE × (1 − share) (s9.3(1)) |

Each calculation choice (QPW option, fNRB option, TOOL03 option, SEC equation) is wired into the calculation. The additionality tool choice is checked against the VMR0015 s7 limits and flagged if it does not fit. The engines sum over any number of project sections, fuels, combustion sources, grid loads and shared plants.

The TOOL03, VT0010 and SEC inputs come from the PD/MR Appendix 2 parameter tables. The baseline inputs (sections, fuel rows, fNRB determinations, Adj_LE, monitored records) come from "Appendix 2 (continued): VMR0015 data and parameters by project section and fuel", which follows the Appendix 2 tables (per-section and per-fuel values do not fit a single-value template cell; 19 October review, F9). Where a parameter is kept per section or per fuel in the methodology records and also stated as an Appendix 2 "Single value", the engine compares the two and flags any difference. See `reference/TEAM_QA_COMPLIANCE.md`.

## Changes from v3 to v3.1

1. **MR engine: unknown section ID.** An MR section whose ID is not in the registered PD now earns 0 and shows a flag. Before, it silently used the first PD section's baseline fuels.
2. **Navigation.** The left menu now lists every page:
   - "Emission reductions (ERR)" for all three roles
   - "VCU requests" for the PP
   - **"Issue VCUs"** for the Standard Registry (the mint page was reachable only as a tab)
3. **Export metadata.** The "Dry Run" version field was removed and the auto-generated tag replaced. Guardian discards both on import anyway (`policy-import.ts`).
4. **Sample documents for all 7 forms, plus the run guide.** Each sample is schema-valid with 0 errors against the v3 schemas. Run through the policy's own engines, they give ex-ante 1666.620262 and ex-post 1556.947181 tCO2e.
5. **Reference report corrected** where it still said double issuance was not blocked (4 places, marked "v3.1 correction").
6. **PD engine: additionality tool vs VMR0015 s7.** If the selected tool does not fit the estimated annual ER (TOOL19 up to 20,000, TOOL21 up to 60,000 t CO2e/yr), a calculation flag says so. It is a flag only; ER is unchanged. Before, the engine only listed the allowed tools.

7. **119 orphan schemas removed (532 → 413).** No form, block or schema referenced them: 112 were older copies of sections that exist in the live forms, mostly two stale generations of the Verification Report sections. All 7 samples still validate with 0 errors after the removal.

8. **12 duplicate sub-schemas merged (413 → 401).** These were identical copies of the same row type, for example "Interviewee row" kept once for the Validation Report and once for the Verification Report. Each now exists once, named for what it is shared between, such as "Interviewee row (Validation and Verification)". Template sections that only share a field layout ("3.1.7 Project Crediting Period", "4.4.3.1 Non-Permanence Risk Analysis"…) stay separate, so the forms keep mirroring the Verra templates.
9. **Reject with a reason.** The six Reject buttons (VVB and Standard Registry, on PDs, MRs, Validation and Verification Reports) open a dialog asking why. The reason is saved on the document (Guardian's built-in `option.comment`) and shown in a new **Reviewer comment** column on the twelve grids, so the author sees what to fix.
10. **Monitoring period length comes from the period dates.** The MR engine counts the days between the start and end dates (inclusive). If the typed number of days differs, it uses the dates and shows a flag. Before, it trusted the typed number.
11. **Dates in "01-March-2025" style are read correctly** for the PD vintages; an unreadable start date is flagged instead of silently defaulting to 2026.
12. **VT0010 Eq.(13)–(14) computed.** v3 took the shared-plant emission factor EF_PE,SPP,n as a typed number, although Appendix 2 already held the inputs. It is now calculated from Q_n,f, NCV_f, EF_CO2,f and EG_n (Eq.13), with the cogeneration share from HG_n and η_cogen,n (Eq.14), both as declared formulas (`eqHSPP`, `eqEFSPP`, `eqEFSPPused`) and in code. A typed factor that differs by more than 1 % is flagged. The sample has no shared plant, so its result is unchanged.
13. **Appendix 2 cross-check.** Where Appendix 2 states a "Single value" for a parameter the engine takes from the records (PD: baseline fuel use, emission factors, fNRB, Adj_LE, m, P_y, QPW_y, COEF; MR: m, P_y, QPW_y, E. coli failure share, fNRB, Adj_LE, SDW checks, COEF), a difference is flagged. ER is unchanged.
14. **Policy description updated**: the calculation summary, how double issuance is blocked, the open points, and (with items 15–17) the project-emission and E. coli rules.
15. **Project emissions always deducted in full** (AMS-III.AV Eq.(7), ER = BE − PE − LE). Before, a section that was not credited (E. coli, table 14, sampling) dropped its share of PE, which overstated ER slightly (0.39 t in the 12 % E. coli test case). PE is now spread over the sections that stay credited.
16. **E. coli rule at project level.** Table 11 (c): "Emission reductions cannot be claimed if over 10% of appliances in the project activity fail". The failure share is now also tested pooled over all sections; over 10 % gives no ER for the period. The per-section test stays (stricter). Each failed test now shows a flag; before, a section was zeroed without one.
17. **Untested working appliances flagged.** A working appliance with no E. coli result counts as not passing in m, because table 11 (c) is not verified for it. That is the conservative reading; the text does not say. It is now flagged for the VVB. In the sample the untested appliances are the 5 per zone that are not operating, so nothing changes there.

18. **A failed table 14 check voids the period.** Table 14: "Emission reductions cannot be claimed if project activity fails to meet SDW standards". The project activity is the whole project, so a failed check in any section now gives 0 for the period; before, only that section lost its credit.

19. **Two policy files, one per template set.** The single file switched between v5.0A and v5.0B with schema conditions on `templateVersion`. In a live MGS test of a file built the same way, choosing v5.0B still showed the v5.0A sections and never showed Right to Operate. Each file now has one template set only: `templateVersion` is fixed, the other set's sections are removed, and the sub-schemas only they used are dropped (33 from A, 82 from B). The engines, the mint chain and the validator are identical in both files. Built with `tools/variant.py` from the same source tree.

20. **Input range checks.** Guardian schema fields have no numeric bounds, so a typed fNRB of 6.2 (for 0.62), an η_wb of 15 (for 0.15), baseline fuel shares adding to more than 1, or a negative meter reading used to be credited. Both engines now void the calculation and list the value.

21. **Applicability conditions follow the methodology text.** PD 3.2.2 had five free-text fields; one ("no ozone-depleting substances") is not in AMS-III.AV v09.0, and para 4(c) and the para 2 and 3 conditions were missing. It now has seven Met / Not met selections (paras 2, 3, 4(a)–(d), VMR0015 s4), each with an evidence field. A "Not met" voids the calculation in both engines.

22. **v5.0B section titles follow Verra's v5.0B wording.** Verra's v5.0B templates title PD 2, MR 2, Validation 3.2 and Verification 4.3 "Stakeholder Engagement and Safeguards"; the v5.0A templates say "Safeguards and Stakeholder Engagement". The v5.0B file carried the v5.0A wording in 14 places (6 schemas); fixed. The v5.0A file keeps the v5.0A wording. Checked against the templates' tables of contents on verra.org, 17 Oct 2026.

23. **Fields follow Verra's template tables, label by label.** Every section was present, but the tables inside them were not: checked against the v5.0B templates on verra.org, 102 of 172 PD table labels and 94 of 150 MR labels had no field (for example, PD 1.2 Audit History had 5 of Verra's 7 columns, MR 1.5 Other Entities was one text box instead of an 8-row table, MR 2.2 consultation and FPIC were one text box each instead of 5 rows each). Each table of the PD, MR, Validation and Verification templates of both sets was written out as a spec (`tools/template_build/tspec/`, 967 labels for v5.0A and 925 for v5.0B) and added with `tplbuild.py`. It only adds: nothing that existed was removed or renamed, so the engines, the mint chain and the sample results are unchanged. New fields are optional and their descriptions name the template, section and table. Now **0 labels without a field** in all eight templates (`tools/template_check/`). The sample documents fill every new field consistently with the existing sample data (`tplfill.py`). The same pass removed labels of the other template set that the master build had left in each file (the v5.0B file called 24 shared Validation Report sections "v5.0A", and both files carried a "v5.0A; v5.0B variant selected with templateVersion" description from the single-switch version).

24. **Overlapping monitoring periods are blocked** (VCS Standard v5.0 §3.4.5), from the 18 Oct MGS edit. A customLogic block between the MR form and its save, and one between the registry's Approve button and the approval save, compare the report's dates with the project's registry-approved reports (matched on `projectRef`, which the form fills from the PD and locks). Sharing a day blocks it with the reason shown; adjacent periods, other projects and rejected reports pass. `tools/overlap_test.js` runs 8 cases against the policy's own script. The calculation also flags fNRB option 2: the CDM withdrew TOOL30 from 1 Jan 2026 (EB125; default values moved to TOOL33), and VMR0015 §9.2 still lists it. The policy description now states the five interpretations as applied defaults.

25. **Template row schemas named after their tables.** 53 schemas in the v5.0A file and 13 in v5.0B had generator names ("3.2.1.2 item row 2", "Risk table row 7 (PD v5.0A)", "Safeguards item row") or shared one name with another schema. Each now carries its section and table name, for example "3.2.1.2 Stakeholder Consultation and Ongoing Communication row (VCS Validation Report v5.0A)" or "2.3.1 Labor and Work row (VCS PD v5.0A)". No two schemas share a name. Only names, titles and row descriptions changed; IDs, field keys, blocks and calculations are the same (`tools/template_build/rename.py`).
26. **VT0008 Steps 3 and 4 are checked, not only recorded.** VT0008 v1.0 Step 4: F = 1 - N_diff/N_all, and the activity is common practice where F > 20 % and N_all - N_diff > 3. Step 3 benchmark: the project IRR without carbon revenue must be below the benchmark and with carbon revenue at or above it. The PD calculation now flags either failure (ER is unchanged; additionality is the VVB's finding). The sample (N_all 2, N_diff 1, F 0.5, N_all - N_diff 1) is not common practice, so its flag list stays empty.
27. **Regression extended (now 31 cases)**: two baseline fuels (wood and charcoal with the VMR0015 s9.1 defaults), fNRB option 2 (TOOL30 Eq.(1) NRB/(NRB+RB) × 0.74 = 0.5476, ex-post 1,396.798721, computed independently in Python), VT0008 common practice and the VT0008 benchmark test.

28. **Day schools and other institutions (CDM clarifications SSC_792 and SSC_795).** Option 2.2 multiplied persons × litres × every day of the period. The CDM Meth Panel clarified that schools count the days pupils are physically present, and day schools pro-rate the 3 L default to the hours present (e.g. 9/16 × 3 L). An optional "days present" field on the option 2.2 record (MR) and the PD section is now used when filled, never more than the period; empty means the old behaviour, so the sample is unchanged. Regression case: 1,200 pupils, 9/16 × 3 L, 190 school days.
29. **TOOL30 flag cites the full evidence.** AMS-III.AV v09.0 (EB 125) itself was revised "to remove reference to TOOL30 and include reference to TOOL33", and the CDM withdrew TOOL30 from 1 Jan 2026. VMR0015 v1.0 s9.2 still lists it and VMR0015 applies its own text "unless indicated otherwise", so option 2 stays and the flag now says all of this.

30. **Each file has its own identity.** Both files had inherited the same Guardian policy id, uuid, topic, instance topic and token id from the master export. Guardian replaces all of these on import (`policy-import.ts`: new uuid, null instance topic, new topic; `token-import.ts`: new token id; `schema-import.ts`: new schema topic and iri), so the two never collided on MGS, but a reader would see two files with one identity. Each file now has its own uuid and token id, and the stale policy id and topics are cleared, including the old topic and database id inside every schema file. Nothing else changed.

Items 15–18 come from re-reading AMS-III.AV v09.0 (EB 125) table 11 and Eq.(7). Items 12–13 follow the bounty Q&A on tools (`reference/TEAM_QA_COMPLIANCE.md`). Items 9–11 come from the 13 October MGS build, ported verbatim. Two parts of that build were deliberately not taken. Its customLogic block for the mint amount is not needed, because Guardian's mint rule is evaluated with mathjs, so `min(ERverified, ERcalculated)` works as is (`PolicyUtils.aggregate`); the bounty Q&A also requires calculations in mathBlocks. Its PP Verification-report list had no owner or assignment filter, so any proponent could request VCUs for any project.

31. **19 October audit.** Fixes from checking every block, formula and schema against the text; none changes the sample results:
    - **Survey values.** η_wb (VMR0015 s8.1 footnote 3) and X_boil are computed from the baseline-survey rows when the PD has them, and a typed value that differs is flagged. QPW_pp is compared with the survey and flagged.
    - **Core equations declared.** VMR0015 Eq.(1), AMS-III.AV Eq.(2), (3), (6), (7), the cap, m, fNRB option 2, X_boil, η_wb, VT0008 F and the sampling size and discount are declared as formula functions in both mathBlocks. The code checks itself against them on every run.
    - **fNRB.** Both engines use the VMR0015 s9.2 determination record, and a fuel row that disagrees is flagged.
    - **New flags:** P_y missing; no functionality checks; a monitoring period outside the crediting period.
    - **TOOL03 option and FC unit** are now lists of options.
    - **Template wording.** All 1,892 Verra template labels match a field title inside their own section. 26 (v5.0A) and 25 (v5.0B) titles were reworded and the missing template fields and tables added.
    - **VT0010 equation numbers** corrected (PE_A is Eq.(5)).
    - **Sample text** corrected: the η_wb source, the X_boil definition, the VT0008 N_diff definition and the crediting period numbers.
32. **Integrity test without MGS.** `tools/guardian_math/` runs the mathBlocks through Guardian's own math engine (copied from the Guardian source) and replays the whole workflow through the policy's block graph: 82 of 82 checks pass on both files. The MGS Policy Integrity Test could not replay the recorded workflow: Guardian's test runner gives the replayed project description a different id from the one the recorded approve step points to. (Superseded on 21 Oct: tests recorded from a fresh dry-run score 100 % on MGS; see "MGS dry-run and Policy Integrity Tests".)
33. **Regression extended to 45 cases**, run on Guardian's math engine when `tools/guardian_math` is installed. New cases: TOOL03 options A (mass, volume) and B, VT0010 PBWA, SEC by Eq.(4), baseline-survey η_wb and X_boil, Adj_LE survey value, PD options 2.1 and 2.2, MR option 2.1, P_y missing, no functionality checks, period outside the crediting period, fuel-row fNRB mismatch.

34. **Second review, 19 October** (findings F1–F23; the open ones are closed or explained in `docs/GAP_CLOSURE.md`). Fixed:
    - **Double issuance.** VCUs are issued at most once per monitoring report; an ERR can be re-opened only while no verification report of its MR is pending, approved or used for issuance; the PP overlap check now covers reports under review and refuses a reused MR ID (F1, F2).
    - **Prechecks before any status change.** The verification and VCU-request prechecks are children of their forms, so Guardian runs them before it saves or locks anything (F3).
    - **fNRB without a value** for its own option gives fNRB = 0 with a flag, never the fuel-row value (F5).
    - **Calendar-year vintages** in the ex-ante and ex-post ERR rows, pro-rated by days; totals unchanged (F6).
    - **Equation text** in PD 4.2 and MR 5.2 now matches the code: VT0010 v1.1, not TOOL05 (F11).
    - Negative ex-ante ER reported as 0 with a flag (F15); trust chain shows the verification report (F14); project filter lists own projects only (F21); short user-facing policy description (F20).
    - **Form order.** PD and MR open with the cover page and follow the template's section order; the methodology records come last (F10).
35. **Field labels.** Guardian shows a field's `description` as its label, not its `title`. Every description now starts with the template title (`tools/audit/labels.py`), so the template wording is what the user sees.
36. **Gap closure** (`docs/GAP_CLOSURE.md`). Closed: sample metering scaled to the section (F7); interactive effects applied, and η_wb / X_boil per section (F8); TOOL03 per fuel and source, and VT0010 per load and per plant with several fuels (F12); project IDs unique across proponents (F4); registration only after an approved "Validated" validation report (F13); PD 1.7 inside section 1, legacy duplicates removed (F10); Appendix 2 (continued) for per-section records (F9); vintage rows that add up (F16); unused inputs now checked (F17); table 13 from the date of supply. Also fixed: the double-issuance rules no longer need `allowEmptySource`, which MGS (Guardian 3.7.1-rc) lacks, and the samples validate again. Regression 60/60, replay 94/94.
37. **MGS form fix (20 Oct).** On MGS, the PD form refused the leakage adjustment with "adjLeDefault must be equal to one of the allowed values". Two number fields were dropdowns with a single numeric value: Adj_LE default (0.95) and fossil-fuel fNRB (1). They are now plain number fields with that value as the default. The calculation always applies 0.95 and 1 under those options, and flags any other entry (VMR0015 s8.3 and Eq.(1)). A regression case was added: 60/60.
38. **MGS run findings (20 Oct), fixed.**
    - **Re-open was unreachable on MGS.** The verification-report form saves the report as a new version of the ERR (Guardian's `editType: edit`, needed to lock the ERR), and Guardian then marks the ERR as a previous version. Every ERR list hid previous versions, so after a verification the ERR vanished and could not be re-opened or re-verified. The three ERR lists and the two guard sources now show all versions.
    - **The validation-report precheck now sits inside its form.** Guardian runs it before anything is saved and returns its message, as the verification and VCU-request prechecks already did.
    - The workflow replay now models both Guardian behaviours: `hidePreviousVersions`, and the edited flag set by `editType: edit`. It reproduces the MGS failure on the old files and passes on the new ones: 94/94.
39. **MGS integrity tests and the issuance race (20 Oct evening), fixed.**
    - **Why the tests scored 99 %.** Both Policy Integrity Tests replayed all their steps and minted 1,556, but scored 99 %. The monitoring report and the ERR carried `pdRef` / `mrRef`, copies of Guardian document ids that change on every replay. Guardian's comparator ignores `id` and `ref` but not custom fields holding ids. The link is already in each VC's own `ref` field and its relationships, so both fields are removed.
    - **The issuance race.** On MGS, three of four runs on B minted nothing when the project proponent requested VCUs right after the approval. The approval save landed after the request and left the verification report "Registry approved", while issuance required "VCU requested". Issuance now accepts either status, and the guard still allows one issuance per monitoring report. The replay reproduces the failure on the previous files and passes on these.
40. **The missing ex-ante ERR on MGS (21 Oct), fixed.** No Ex Ante ERR was ever created on MGS. The new project-ID check (`pp_project_id_unique`) and the two admin guards ended with `done(documents)`, which passes a one-item array. With `passOriginal`, Guardian passes the `done()` value on unchanged (`custom-logic-block.ts`). The PD save then emitted an array, and `switch-block.ts` turns an array into array-valued fields, so `templateVersion == "v5.0B"` was false and the ex-ante calculation never ran. The checks now end with `done(doc)`, as the overlap checks always did. The workflow replay now models both behaviours: it reproduces the missing ex-ante ERR on the previous files and passes on these (94/94).

The sample gives the same results: ex-ante 1,666.620262, ex-post 1,556.947181, mint 1,556.

Rebuild order for both files (from the master tree): `tools/variant.py` (lock one template set) → `tools/template_build/relabel.py` → `tplbuild.py … apply` → `rename.py` → `resync.py` (rebuild each schema's nested copies and JSON-LD context) → pack. Re-running it reproduces these schemas.

## Re-run the checks

```
P=policy/without_integrity_test/VMR0015_Safe_Drinking_Water_dMRV_v3.1_VCS-v5.0B.policy   # or ..._VCS-v5.0A.policy with tools/fixtures/v5.0A/
python3 tools/wiring.py   $P
python3 tools/reach.py    $P
python3 tools/regression.py $P tools/fixtures/PD.full.json tools/fixtures/MR.full.json
(cd tools/guardian_math && npm install)        # once; then regression.py runs on Guardian's own math engine
mkdir /tmp/p && (cd /tmp/p && unzip -q $OLDPWD/$P) && node tools/guardian_math/sim.mjs /tmp/p sample-data/v5.0B
node tools/guardian_math/formulas_check.mjs /tmp/p
python3 tools/audit/blocks_audit.py /tmp/p /tmp/blocks.csv
```

Every result below holds for both files.

| Check | Result |
|---|---|
| `wiring.py` | 0 problems: event sources and targets, button wiring, navigation targets, unique IDs and tags |
| `reach.py` | 181 (179 on the previous build, the same count as Guardian's validator; +2 for the prechecks inside their forms); VM0047 gives 210 |
| `regression.py` (needs `node`) | **60/60 pass**, on Guardian's own math engine. The policy's mathBlocks are compared with an independent Python implementation written from the text, on the sample, 57 edge cases and the s7 additionality check |
| `guardian_math/sim.mjs` | **94/94 checks pass, under Guardian 3.7.1-rc rules (the MGS build: no `allowEmptySource`).** The whole workflow replayed through the policy's block graph, every document schema-validated: issuance and mint of 1,556; second issuance refused (same request, forged request for an issued MR, re-opening an issued ERR); overlap with approved and under-review reports; reused MR ID; prechecks refusing before any status change; re-opening after a rejected verification; min(ERverified, ERcalculated); user isolation |
| `guardian_math/formulas_check.mjs` | Every declared formula function builds in Guardian's math engine: 18/18 (PD), 19/19 (MR) |
| `audit/blocks_audit.py` | 0 problems in 219 blocks (events, buttons, roles, schema references, grid columns, filter and validator fields, mint token, navigation) |
| Declared formulas | 14 formulas and 18 / 19 formula functions per mathBlock, all valid in Guardian's math engine; the code checks itself against the functions on every run |
| Samples | All 7 of each set validate against their file's schemas once Guardian's preset fields (project, MR and verification references) are filled, which the replay does on every submission; every `$ref` resolves |
| Template tables (`tools/audit/tpl_strict.py`) | v5.0A: PD 254, MR 231, Validation 264, Verification 218 labels; v5.0B: 238, 212, 264, 211; **every label is a field title inside its own section** (strict check; the earlier `template_check` matched words anywhere in the form) |

The edge cases in `regression.py` are:
- E. coli failures above 10 % in one section (its PE share still deducted)
- E. coli failures above 10 % of the whole project (nothing credited)
- a working appliance with no E. coli result
- a failed table 14 check in one section (the whole period is voided)
- every section failing table 14 (ER floored at 0, never negative; the unoffset project emissions are flagged)
- a public network supplying a quarter of one zone's persons (those persons are excluded, table 13; 25 % is only the test input)
- the 5.5 L cap
- a 12 % sampling result in survey year 1 (6 % discount)
- a 12 % sampling result in survey year 3 (no credit for that sample; para 18(a) requires a supplemental or new sample)
- a sample size of 25
- an unknown section ID
- a duplicate section ID
- typed period days that disagree with the period dates (the dates win, with a flag)
- a half-year monitoring period (the 5.5 L cap pro-rates to 181 days and binds)
- a VT0010 shared plant without cogeneration (Eq.13) and with it (Eq.13–14)
- an Appendix 2 fNRB (MR) and m (PD) that differ from the records (flagged, ER unchanged)
- out-of-range inputs: fNRB 6.2, η_wb 15, baseline fuel shares adding to 1.2, a negative meter reading (all voided, value listed)
- an applicability condition marked Not met (voided)
- two baseline fuels in one zone (wood and charcoal, Eq.(1) summed per fuel)
- fNRB option 2: TOOL30 NRB/(NRB+RB) × 0.74 = 0.5476 (ex-post 1,396.798721, flagged)
- VT0008 common practice (N_all 10, N_diff 2) and a benchmark failure (flagged, ER unchanged)
- a day school under option 2.2 (1,200 pupils, 9/16 × 3 L, 190 school days; SSC_792/795)
- TOOL03 option A by mass and by volume, option B, and option A in the PD
- VT0010 PBWA (Eq.(7)-(9)); SEC by Eq.(4)
- baseline-survey rows (η_wb 0.175, the VMR0015 footnote 3 example; X_boil 10/15); Adj_LE survey value 0.92
- PD options 2.1 and 2.2; MR option 2.1 with five devices
- P_y missing; no functionality checks; a period after the crediting period; a fuel-row fNRB that differs from the determination
- fNRB option 2 with no TOOL30 data (fNRB 0, flagged); option 1 with only the UNFCCC value; project emissions above baseline in the PD (ex-ante 0, flagged)

## MGS dry-run and Policy Integrity Tests (done, 21 Oct)

Both files were dry-run on MGS (Guardian 3.7.1-rc), each with a Policy Integrity Test saved inside the exported file. Details and the file-level audit: `docs/MGS_ROUND4_RESULTS.md`.

| | v5.0A | v5.0B |
|---|---|---|
| Ex Ante ERR after the PD | 1,666.620262475, no flags | 1,666.620262475, no flags |
| Ex Post ERR after the MR | 1,556.947181413, no flags | 1,556.947181413, no flags |
| Minted | 1,556 VCU | 1,556 VCU |
| Policy Integrity Test | 100 %, 13 of 13 documents | 100 %, 13 of 13 documents |
| Recording | 23 block actions, 208 s | 23 block actions, 201 s |

On v5.0B, the follow-up checks behaved as designed:
- re-open after a rejected verification
- a second issuance for the 2028 report (1,556, total 3,112)
- re-open and a second VCU request both refused after issuance (total stays 3,112)
- a VCU request right after approval still mints
- a wrong VVB ID refused with HTTP 422

The runs were made through the MGS API. The recordings and exports were then checked file by file (`docs/MGS_ROUND4_RESULTS.md`). Neither file is published to testnet, so there is no token ID or IPFS reference.

## Not done yet (stated plainly)

1. **Re-run an integrity test on your own MGS.** Import either `..._with_integrity_test.policy`, open Test Details and press Run (about two minutes). Guardian keeps test scores on the server, not in the export, so this is how a reviewer sees the score.
2. **Real-data test** (`docs/REAL_DATA_TEST.md`). No VMR0015 project is registered yet. A verified AMS-III.AV v04.0 project (Nazava, Gold Standard GS4290, Bureau Veritas, 28,879 t CO2e) was therefore run through the policy's engine:
   - Its verified arithmetic is reproduced to rounding: 28,880.00.
   - Under VMR0015 the same data earn 0, because 11.29 % of filters failed E. coli, over the 10 % limit of AMS-III.AV v09.0 table 11(c).
   - The VMR0015 s9.1 wood emission factors would raise the result by 51 %.

   The number of operating filters per vintage is derived from the verified BE. The project's monitoring report and ER spreadsheet would make that input independent too. VCS 3599 is registered under AMS-III.AV v08 and is not used as a target.
3. **Review findings not closed, with the reason** (full table in `docs/GAP_CLOSURE.md`):
   - One mint per verified MR, with no vintage on the token (F6): Guardian's mint block has no vintage parameter, as in VM0047. The calendar-year split is in the ERR's vintage rows.
   - The E. coli gate also applies per section (F22). This is stricter than table 11 and follows VMR0015 s9.3(2), so it can only lower the credited amount.
   - `householdsServed` and the fuel row's device type are not in the arithmetic, and neither is the s9.3(2) device register (F17). No equation of VMR0015 or AMS-III.AV uses them; they are evidence for the VVB.

## Methodology decisions, settled against the published text

1. **fNRB option 2 = TOOL30 × 0.74, flagged.** VMR0015 v1.0 §9.2 lists "Calculated based on CDM TOOL30 and applying an uncertainty discount of 26%" (footnote 4: 0.60 × (1 − 0.26) = 0.44). v1.0 (31 Oct 2025) is the only active version. AMS-III.AV v09.0 (EB 125) removed its own reference to TOOL30 in favour of TOOL33, and the CDM withdrew TOOL30 from 1 Jan 2026, and Verra's VM0050 revision says only that Verra "may remove CDM Tool 30". So the option stays, and the calculation flags it. The sample uses option 3 (TOOL33 default).
2. **Table 14: a failed check voids the period; a missing or older-than-two-years check is flagged.** AMS-III.AV v09.0 table 14 sets the frequency ("at least once every two years") and one consequence: "Emission reductions cannot be claimed if project activity fails to meet SDW standards". It sets no ER consequence for a missing check, so that is a monitoring-plan finding for the VVB.
3. **The project proponent requests issuance before the mint.** VCS Registration and Issuance Process v5.0 §4.5.1: "All and any periodic VCU issuances shall be initiated by the project proponent stated on the project record."
4. **TOOL19/TOOL21 inside the PD engine, no Guardian tool blocks.** VMR0015 §7 replaces AMS-III.AV para 12 with a choice of VT0008, TOOL21 (≤ 60 kt CO2e/yr) or TOOL19 (≤ 20 kt CO2e/yr), and footnote 2 allows a larger-scale tool but not a smaller one. The PD records the tool, the TOOL19 location route and the VT0008 inputs, and the engine flags a tool not allowed for the estimated ER. Guardian's Tool 19/21 packages are yes/no customLogic checks; the bounty answers put the calculations in mathBlocks (Q1, Q3), and tool-block schema mismatches fail import (Q2). VT0008 has no Guardian tool.
5. **An untested working appliance does not pass m; the 10 % share uses the tested appliances.** AMS-III.AV table 11 counts in m only appliances that "(iii) deliver microbiologically safe drinking water", with water "verified to be <1 cfu / 100 ml". No result means not verified. The 10 % rule is estimated from the tested sample, which table 11 allows ("a statistically valid sample of the appliances").
6. **VCS 3599 is not a target.** It is registered under AMS-III.AV v08, before VMR0015 existed, so its registry total is not used and is not written into the policy.
7. **Validation Report sub-section numbers match the template structure.** The printed PD v5.0B template numbers De Minimis 3.3.1, Baseline Reassessment 3.4.1, Regulatory Surplus 3.5.1 and Additionality Methods 3.5.2. The Validation Report's section 3.3 has the same headings in the same order one level deeper, which gives the schema numbers 3.3.3.1, 3.3.4.1, 3.3.5.1 and 3.3.5.2.
8. **η_wb and X_boil from the survey, per section.** VMR0015 s8.1 footnote 3 weights each boiling device by how often it is used per week. s9.3(2) asks for reductions section by section. So each section with survey rows uses its own usage-weighted η_wb and X_boil. A section without rows uses the pooled survey, and with no survey rows the Appendix 2 values apply.
9. **Interactive effects: BE × (1 − share).** VMR0015 s9.3(1) says the survey results "must be applied proportionally across the population of households". The share of surveyed households that report an interactive effect removes the same share of baseline emissions. With a baseline and a project survey, the larger share applies.
10. **Sample metering (AMS-III.AV table 10(a)) is scaled to the section** by appliances in service (continuous metering) or by appliance-days in service (representative period). This is the CDM Sampling Standard's estimate of a population total from a sample mean.

## CDM clarifications on AMS-III.AV, checked against this policy

| Clarification | What the Meth Panel said | In this policy |
|---|---|---|
| SSC_774 (v7) | Kiosk volume by sales receipts is acceptable if measured with a standard vessel, without contamination | Now part of AMS-III.AV v09.0 table 10; QPW option 1 records the method and the receipt cross-check |
| SSC_778 | Water kiosks must monitor m at the point of use (household), on a sample | m comes from per-appliance checks at the consumer; record kiosk checks at households |
| SSC_792 (v8) | Schools count the days pupils physically attend; a school on a public network is eligible only if that network does not supply SDW | Option 2.2 "days present" (change 28); table 13 excludes persons supplied with SDW by a public network |
| SSC_793 | National standards with microbiological limits are acceptable; WHO or national standard must be met | Table 14 checks record the compliance route (national standard or WHO) |
| SSC_795 | 3 L/person/day applies to boarding schools; day schools pro-rate to hours present | Enter the pro-rated QPW_pp with the "days present" field (change 28) |
| SSC_807 (v8) | For AMS-III.AV v8 the baseline uses the AMS-I.E projected fossil-fuel emission factor | Superseded for VCS projects: VMR0015 replaces Equation 1 and prescribes the IPCC wood and charcoal factors (s9.1), which the policy uses |
| SSC_816, SSC_830 | P_y comes from annual surveys under the monitoring plan, not a census; sampling must follow the CDM standard | P_y is a monitored survey value per section; sample size, confidence and precision are checked (para 14, 18) |
