# VM0047 comparison and team requirements

The VMR0015 file measured here is v5.0B, from this package. The VM0047 file is "VM0047 7/24", the Guardian reference policy the team pointed to. The v5.0A file differs from v5.0B only in its template sections; its calculation blocks are identical. The script that took these measurements is `tools/audit/blocks_audit.py`, plus the counts shown below, each read from `policy.json`.

## 1. Structure against VM0047

| Item | VM0047 | VMR0015 (this file) | Comment |
|---|---|---|---|
| Blocks | 252 | 219 | The team's range is 150-250. VM0047's extra blocks are its CCB branch and the Verra Project Hub transformation add-ons, neither of which applies here |
| Blocks with a default name (Block_1 …) | 0 | 0 | |
| Tags shared with VM0047 | — | 172 | Same workflow skeleton, as Jailine asked |
| Roles | Project Proponent, VVB (Standard Registry = owner) | Same | |
| Request forms / saves / grids / switches | 8 / 34 / 22 / 4 | 7 / 33 / 21 / 3 | |
| mathBlocks | 6 (PD ex-ante and ex-post, MR ex-post; each for VCS and for CCB) | 2 (PD ex-ante, MR ex-post) | VMR0015 has no CCB track, so the CCB copies don't apply |
| Tool blocks | 1 (AR-AM Tool 04, forestry) | 0 | Following Q1/Q3, the tool calculations VMR0015 uses (TOOL03, VT0010, sampling, VT0008) are inside the mathBlocks |
| customLogic blocks | 3 (table update, assignment update, mint recipient) | 5 (checks only: overlap ×2, unique project ID, no re-open, no second issuance) | Neither file calculates ER in customLogic (Q1) |
| documentValidator blocks | 0 | 6 | Prechecks that VM0047 doesn't have: registration needs an approved validation report, double issuance is blocked, and the VVB profile must be approved |
| Mint | 1 block, rule `totalToken` | 1 block, rule `min(ERverified, ERcalculated)`, non-fungible VCU, 0 decimals | |
| Schemas | 530 (VCS + CCB templates) | 411 (B) / 478 (A) | Verra VCS v5.0 template sets, with 1,892 template labels in their own sections |

### Where VM0047 is stronger: what the math block shows on screen

| | VM0047 MR ex-post block | VMR0015 MR ex-post block |
|---|---|---|
| Declared formula items (visible in Guardian's math editor) | 208 variables | 14 variables + 19 functions |
| Field links | 156 | 25 |
| Declared outputs | 7 | 0 (results written by the code) |
| Code lines | 308 | 637 |

VM0047 lays its equations out as declared formulas. VMR0015 declares the core equations (VMR0015 Eq.(1), AMS-III.AV Eq.(2)-(7), cap, m, fNRB, TOOL03, VT0010, sampling, VT0008) as formula functions, and the code checks itself against them on every run. The loops still live in code: over sections, fuels, records and vintages.

- **The reason:** the team asked for summation over many project instances. Declared formulas take one value per field; they can't loop over tables.
- **The risk:** a reviewer who opens the math editor sees fewer formulas than in VM0047.
- **To close it later:** declare the per-section terms as formula variables. This changes the file hashes, so it would need a new MGS run.

## 2. Team requirements, one by one

| Requirement (who, when) | Status | Evidence |
|---|---|---|
| Descriptive block names, 150-250 blocks (Jailine, 30 Jul) | Met | 219 blocks, 0 default names |
| Digitise the CDM base (AMS-III.AV) together with the VMR0015 revisions (Jailine, 30 Jul) | Met | `reference/METHODOLOGY-TRACE.md`. VMR0015 Eq.(1) replaces AMS-III.AV Eq.(1); AMS-III.AV Eq.(2)-(7) and tables 3, 4, 10, 11, 13, 14 are kept |
| Formulas from every referenced tool, inside the mathBlocks (Jailine; Q1, Q3, Q4, Q8) | Met | TOOL03, VT0010 v1.1, CDM sampling standard, VT0008, TOOL19/21 limits. Only the tools VMR0015 s2 names, plus TOOL33 (s9.2) |
| Assumptions written as explicit logic (Jailine, 30 Jul) | Met | Every assumption is either a calculation rule or a flag. Each decision is in README "Methodology decisions", with its source text |
| Sum over several project instances (Jailine, 30 Jul) | Met | Per section, per fuel, per load, per plant. Regression cases cover 4 sections, 2 fuels, 2 loads and a 2-fuel plant |
| Schemas = Verra's published templates (Jailine, 30 Jul; Wes, 5 Aug) | Met | 1,892 of 1,892 labels of the 8 VCS v5.0 templates. Template set A and B as separate files |
| Applicability conditions, inputs and calculation choices wired into the logic (Jailine, 30 Jul) | Met | 7 applicability selections, plus the QPW, SEC, fNRB, TOOL03, sampling-basis and additionality choices, all read by the code |
| Follow VM0047's workflow (Jailine, 30-31 Jul) | Met | 172 shared tags, same roles and steps (section 1) |
| README and step-by-step guide (Jailine, 31 Jul) | Met | README, `docs/FORM_FILLING_GUIDE.md` |
| Calculations in mathBlocks, not customLogic (Q1) | Met | 2 mathBlocks. The 5 customLogic blocks only refuse invalid actions |
| Test with Verra project data (Wes, 1-2 Jun) | **Partly met** | No VMR0015 project exists yet. A verified AMS-III.AV project (Nazava, Gold Standard GS4290) was run: `docs/REAL_DATA_TEST.md`. The operating filter count per vintage is derived from the verified emissions, because the project's monitoring report and spreadsheet weren't readable here |
| Policy Integrity Test (Wes, 2 Jun) | Met | MGS, 21 Oct: 100 % on both files, 13 of 13 documents, test saved inside each `..._with_integrity_test.policy`. The exports were checked against the built files (`MGS_ROUND4_RESULTS.md`) |
| Correctness and production usability over speed; work checked by hand (Wes, 5 Aug) | **Not yet: needs a person** | See section 3 |
| One submission per methodology, no extra versions (Wes, 21 Sep) | Your decision | Two files, because Guardian can't switch template sets inside one policy and the team hasn't said which set it wants. Present them as one submission |

## 3. What the tools check, and what needs a person

| Checked by tools (re-runnable by anyone) | Still needs a person |
|---|---|
| The mathBlocks run on Guardian's own math engine (`tools/guardian_math`) | Re-running one MGS integrity test on the reviewer's own MGS |
| An independent Python implementation written from the methodology text, compared with the mathBlocks: 60/60 cases | Reading the PD and MR forms against the printed Verra templates |
| Whole-workflow replay under Guardian 3.7.1-rc rules: 94/94 | Checking the formula table in `METHODOLOGY-TRACE.md` against VMR0015 and AMS-III.AV, at least Eq.(1)-(7) |
| Block, wiring, schema and template-label audits: 0 problems | Opening `REAL_DATA_TEST.md` and the Nazava verification report side by side and checking the inputs |
| The real-data run against a verified project | Deciding the open methodology choices: per-section E. coli gate, interactive-effects formula, sample scale-up |
| MGS dry-runs and integrity tests of both files, 100 % (`MGS_ROUND4_RESULTS.md`) | |
| Every number cites its source section or a public link | |

Each check in the left-hand column comes with the command to re-run it (README, "Re-run the checks").
