# Gap closure: every open finding, closed or with its reason

This pass took each open finding (F1–F23) of the 19 October second review and two defects found while checking. A finding was closed wherever the methodology text, the Verra template or Guardian gives a basis for the change. Where it was not closed, the reason is stated.

The sample results are unchanged: ex-ante 1,666.620262475 t CO2e/yr, ex-post 1,556.947181413 t CO2e (−6.580568 % against the ex-ante estimate), mint 1,556 VCU.

## Two defects found while checking (both fixed)

| Defect | Evidence | Fix |
|---|---|---|
| **The "none may exist" double-issuance rules needed `allowEmptySource`, which Guardian 3.7.1-rc does not have.** MGS runs 3.7.1-rc. On that build, a source validation that finds no document fails ("No source documents matched filter(s)"). Normal issuance and re-opening would have been blocked on MGS. | `documentValidatorBlock` source at tags `3.7.1-rc` and `3.7.1`: `allowEmptySource` exists only from 3.7.1 (6 Oct 2026). | The three rules are removed. Two customLogic checks (`admin_err_reopen_guard`, `admin_err_issue_guard`) refuse the same cases by throwing an error. customLogic with `documentsSourceAddon` sources exists in 3.7.1-rc (checked in its `custom-logic-block.ts` and worker). The workflow replay now fails any `allowEmptySource` it meets, so this cannot come back unnoticed. |
| **The packaged samples no longer validated** against the schemas: legacy fields that the samples no longer carried were still required. | `tools/template_build/valsamples.py` | The legacy duplicate fields (pre-template copies of template columns) were removed from the schemas. The lost template label "Reason for rejection" (other GHG programs) was restored. All 7 samples of each set now validate. The only remaining messages are the preset fields (project, MR and verification references) that Guardian fills from the selected document; the replay validates every submission with them filled. |

A third defect was caught by a new check during this pass and fixed before packaging: one new declared formula (`fnPELoad`, first written with `Boole`/`min`) could not be assigned by the compute engine. Guardian builds the formula functions in one `try` block (`math-context.js`), so every function after it was dropped. The function now holds VT0010 Eq.(5) + (8) only; Eq.(7) and (9) stay in the code. `tools/guardian_math/formulas_check.mjs` now checks that every declared function builds: 18 of 18 (PD block) and 19 of 19 (MR block) in both files.

## Findings closed

| id | Gap | What was done | Basis |
|---|---|---|---|
| F4 | Project IDs typed and not unique across project proponents | `pp_project_id_unique` (customLogic, between the PD form and its save) refuses a project ID used by any other PD in the policy that is not rejected. Nothing is saved. MR IDs were already unique per project (F2). | Project ID is the join key for every later document. Replay: a second PP submitting the same ID is refused. |
| F6 | Vintages span calendar years | Already split into calendar-year rows in the ERR (ex ante and ex post, pro-rated by days). The mint part is under "Not closed". | VCUs carry a vintage period; calendar-year rows let each vintage be read off the ERR. |
| F7 | Sampled meter data not scaled up | QPW option 1 records now state their sampling basis (AMS-III.AV table 10). (a) Continuous metering of a sample: section QPW = metered volume × appliances in service / appliances metered. (b) Metering over a representative period: metered volume / metered appliance-days × appliance-days in service. (c) All appliances metered, or a kiosk meter (table 10(b)): added as measured. Mixing bases in one section: the section is not credited, and a flag says so. A sample without a QPW_y sampling record is flagged. New fields: `samplingBasis`, `appliancesCovered` (record) and `appliancesInService`, `applianceDaysInService` (MR section). Declared functions `fnQPWSample`, `fnQPWRepr`. | Table 10(a) allows "flow meters installed on a statistically valid sample … either continuously or over a representative period". Scaling a sample mean to the population is the CDM Sampling Standard estimator. |
| F8 | Interactive effects not applied; η_wb and X_boil pooled | **s9.3(1):** BE × (1 − share), where share = households reporting an interactive effect / households surveyed. With several surveys (PD baseline survey, MR project survey), the largest share applies. A questionnaire without the question, or a missing result, is flagged. **s9.3(2):** η_wb and X_boil are now computed per section from that section's survey rows. A section without rows uses the whole survey; with no survey rows, Appendix 2 applies. | s9.3(1): "must be applied proportionally across the population of households". s9.3(2): "so that GHG emission reductions can be calculated appropriately, section by section". |
| F9 | Baseline inputs come from records outside the template | The records block is now titled "Appendix 2 (continued): VMR0015 data and parameters by project section and fuel" (MR: "… monitored by project section"). Single values in the Appendix 2 tables are compared with these records and any difference is flagged. | The template's Appendix 2 is one table per parameter with a single value. VMR0015 s9.3(2) needs per-section values and Eq.(1) needs per-fuel values, which one cell cannot hold. |
| F10 | PD 1.7 outside section 1; legacy duplicate tables | PD 1.7 ("Ownership" in v5.0A; "Right to Operate and Right to Reductions and Removals" in v5.0B) is now inside section 1, after 1.6, in template order. Samples, fixtures and the sample generator were moved with it. The legacy PD 1.10 and MR 2.1 duplicates are removed. | Template order. 1,892 of 1,892 template labels are still in their own section. |
| F12 | One fuel, one load, one plant in TOOL03 / VT0010 | A2.2.2 gains a per-fuel and per-source table: TOOL03 Eq.(1) summed over fuels i and sources j, COEF per row by option A (Eq.(2)/(3)) or B (Eq.(4)). A2.2.3 gains a per-load table (VT0010 Eq.(5), (7)-(9) per load L) and a per-plant, per-fuel table (Eq.(11) per plant n; Eq.(13)-(14) summed over fuels f). When a table is filled it replaces the single values, with a flag if both are filled. VT0010 Scenario D (dedicated plant, D1 off-grid or D2 back-up) is entered as a TOOL03 source, as VT0010 s5.4.1.1 directs. A typed EC_PE,B without EG_PBWA is no longer used: Eq.(9) defines EC_PE,B only through EG_PBWA. | TOOL03 Eq.(1) Σ_i,j; VT0010 v1.1 Eq.(5)-(14). |
| F13 | PD registered before the validation report | `admin_pp_pd_register_check` runs before the registry's Register action. It needs a "Registry approved" validation report for the same project with the opinion "Validated". | The VCS project cycle registers a project after its validation. VM0047 does not have this check; this policy now does. |
| F16 | Vintage row BE includes sections that were not credited | Each vintage row now reports BE = ER + PE + LE, so every row satisfies BE − PE − LE = ER. The full BE of each section stays in `ex_post.sections`. | Monitoring Report template table 5.5 arithmetic. |
| F17 | Inputs collected but not used | Now used: life span LS against the crediting period (table 3, para 4(c)); UNFCCC draft fNRB status, and fNRB validity against the period (s9.2); EF source 3 against the VMR0015 s9.1 printed values; survey η_d marked "table 4 default" against the table 4 value; measured T_i against Appendix 2 T_i (para 19); the TOOL19 location route; VT0008 WACC = r_e × W_e + r_d × (1 − T_c) × W_d (A2.3 eq.(1)) against the benchmark; table 13 date of supply. All of these are flags, except table 13. | See the reason column under "Not closed" for the two fields still not used. |
| F19 | v5.0A sample starts in 2027 | The v5.0A sample now starts on 1 October 2026 (crediting period 2026-10-01 to 2031-09-30), which v5.0A allows. | v5.0A is for projects starting before 1 Jan 2027. |
| F23 | Minimum Guardian version not shown | Checked against the Guardian tags. `sourceValidations` is in 3.7.0-rc and later. Mint `roundMethod` and customLogic sources are in 3.7.1-rc. `allowEmptySource` is 3.7.1 only, and the policy no longer uses it. The policy description now says: Guardian 3.7.0 or later, and no feature missing from 3.7.1-rc (the MGS build). | Guardian source at tags 3.7.0-rc, 3.7.0, 3.7.1-rc and 3.7.1. |
| — | Table 13 "from that point onwards" | Households connected to a public network are excluded from the date of supply to the period end, not for the whole period. A missing date, or a date before the period start, still excludes them for the whole period. | AMS-III.AV table 13: reductions "cannot be claimed from that point onwards". |

## Not closed, and why

| id | Gap | Why it is not closed |
|---|---|---|
| F6 (mint) | One mint per verified monitoring report, without a vintage on the token | Guardian's `mintDocumentBlock` has no vintage parameter, and VM0047 has the same limit. The calendar-year split is in the ERR's vintage rows, which the VCU request and the trust chain carry. Splitting the mint would need one VCU request per vintage. That changes the PP's issuance request, which VCS Registration and Issuance Process s4.5.1 leaves to the PP. |
| F22 | E. coli >10 % gate applied per section as well as per project | Kept on purpose. AMS-III.AV table 11 states the rule for "the appliances in the project activity", and the project-level gate implements that. The section-level gate is stricter. It follows VMR0015 s9.3(2) (reductions section by section), and it can only lower the credited amount. Both gates are flagged when they bite, and the VVB can see which one applied. |
| F17 (two fields) | `householdsServed` and the fuel row's `baselineDeviceType` are not used in the calculation | AMS-III.AV Eq.(1)-(3) and the para 18 cap work in persons (P_y), not households. Households are reported for table 13 and for the VVB. η_wb comes from the survey's device rows (VMR0015 s8.1 fn 3), so the device type on a fuel row only describes that row. Using either field in the arithmetic would add a step the text does not contain. |
| s9.3(2) device list | Per-device records (date and area of sale, model, recipient, ID or GPS) | They are captured in the MR device register (fields a) to e)) as the evidence that s9.3(2) asks for. They do not enter the calculation, because no VMR0015 or AMS-III.AV equation uses them; QPW, m and P_y come from the monitoring records. |

## Checks after the gap closure (both files)

| Check | Result |
|---|---|
| `regression.py` (Guardian math engine) | 60/60: sample, 57 edge cases (12 new since 19 Oct, including the Adj_LE form fix), s7 additionality |
| `guardian_math/sim.mjs` (workflow replay, 3.7.1-rc rules) | 94/94 (new: duplicate project ID refused; registration before an approved validation report refused; forced second VCU request cannot be issued) |
| `guardian_math/formulas_check.mjs` (new) | every declared function builds: 18/18 (PD), 19/19 (MR); context valid |
| `audit/blocks_audit.py` | 0 problems, 219 blocks |
| `wiring.py` | 0 problems |
| `template_build/integrity.py`, `resync.py --check` | 0 unresolved `$ref`, nested copies in sync |
| `audit/tpl_strict.py` | 1,892 of 1,892 template labels in their own section |
| `reach.py` | 184 reachability notes (181 before, +3 for the three new checks in the default flow) |

The scripts that made these changes are in `tools/gap_closure/`.

**On MGS (21 Oct):** both files dry-run, integrity tests 100 % on both, and the follow-up checks passed (`MGS_ROUND4_RESULTS.md`).
