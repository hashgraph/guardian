# VMR0015 v3.1: Run Guide (who fills what, where, in which order)

One complete run from account creation to VCU issuance, using the seven sample files in `sample-data/`.

**Which file:** import `VMR0015_Safe_Drinking_Water_dMRV_v3.1_VCS-v5.0B_with_integrity_test.policy` (or the copy without the test in `policy/without_integrity_test/`) with the files in `sample-data/v5.0B/` (the sample project starts on 1 January 2027). `..._VCS-v5.0A.policy` goes with `sample-data/v5.0A/`. That sample is the same project but starts on 1 October 2026, as a v5.0A project must start before 1 January 2027; its crediting period runs from 1 October 2026 to 30 September 2031, so the ex-ante estimate has six calendar-year vintages (2026 and 2031 are part years). The annual estimate, the total, the 2027 monitoring report and the mint are the same as for v5.0B.

The PD, MR, Validation and Verification forms also carry every table of Verra's v5.0 templates (audit history, other entities, consultation and FPIC rows, vintage columns and so on). Those fields are optional and do not feed the calculation; the samples fill them all.

For a school or other institution under QPW option 2.2, fill "days present" (school days with in-person attendance) and enter QPW_pp pro-rated to the hours present (CDM clarifications SSC_792 and SSC_795). Leave it empty for households.
The sample is a **test scenario with fictional entities**: Kilimanjaro Safe Water Project, Tanzania. It has 3,000 household filters in four zones and runs on VCS v5.0B dates, starting 1 January 2027.

**Expected results:**

| Step | Expected value |
|---|---|
| Ex-ante (PD) | **1666.620262 tCO2e per year**, 8333.101312 tCO2e in total; v5.0B: 5 vintages (2027-2031); v5.0A: 6 vintages (420.079628 for Oct-Dec 2026, 1666.620262 for 2027-2030, 1246.540635 for Jan-Sep 2031) |
| Ex-post (MR, 2027) | **1556.947181 tCO2e** |
| Mint | **1556 VCU** to the Project Proponent |

## Before you start

- **Roles.** The Standard Registry (SR) is the policy owner and appears as **Administrator**. Create two more users: one selects **Project Proponent** (PP), the other selects **VVB**.
- **Loading a sample.** Guardian gives every schema a new ID on import, so a sample only loads after its header matches your instance.
  1. Open the form and click **Save draft** without filling anything.
  2. Open `tools/draft_builder.html`.
  3. Pick that blank draft and the matching sample, then download the result.
  4. Use **Load draft** in the form.
- **Never use "Fill with test data".** It writes 1 or "Yes" into every field, and the results become meaningless.
- **Read-only (preset) fields are left out of the samples on purpose.** Guardian fills them from the row you opened the form on (project ID, PD reference, MR ID, calculated ER). Do not type over them.
- **The pages only show documents that were assigned to you.** If a VVB or PP page looks empty, the "Assign" step was skipped. The steps below include every assignment.

## The run

| # | Who | Page (left menu) | Action | Sample file | Check after the step |
|---|---|---|---|---|---|
| 1 | PP | Select role → **Project Proponent** | Fill the account form, submit | `1_PP_account.json` | "Waiting for approval" |
| 2 | VVB | Select role → **VVB** | Fill the account form, submit | `2_VVB_account.json` | "Waiting for approval" |
| 3 | SR | **Project proponent accounts**, then **Verifier accounts** | **Approve** each row | none | Status "Registry approved"; PP and VVB now see their menus |
| 4 | PP | **Project descriptions** | **Create** → load PD → submit. Then, in the row's **Assign** column, choose the VVB | `3_Project_Description.json` | PD "Waiting for Approval". In **Emission reductions (ERR)** an *Ex Ante* row shows **1666.620262** per year, no calculation flags. (on MGS this row was missing until the 21 Oct fix, README item 40) |
| 5 | VVB | **Project descriptions** | **Approve** the PD row | none | "Third-party verifier approved" |
| 6 | VVB | **Project descriptions** → the same row, **Validation Report** column | Load the report → submit. Then, on **Validation reports**, **Assign** it to the PP | `5_Validation_Report.json` | Report "Waiting for Approval"; the PP sees it under **Validation reports** |
| 7 | SR | **Validation reports** | **Approve** | none | "Registry approved" (opinion "Validated" is needed later for issuance) |
| 8 | SR | **Project descriptions** | **Approve** | none | PD "Registered". Registration is refused until the validation report of step 7 is "Registry approved" with the opinion **Validated** |
| 9 | PP | **Project descriptions** → registered row, **Monitoring report** column | Load the MR → submit. Then, on **Monitoring reports**, **Assign** it to the VVB | `4_Monitoring_Report.json` | MR "Waiting for Approval". **Emission reductions (ERR)** shows an *Ex Post* row (see the table below) |
| 10 | PP | **Emission reductions (ERR)** | **Assign** the *Ex Post* row to the VVB | none | The VVB sees the row under **Emission reductions (ERR)** |
| 11 | VVB | **Monitoring reports** | **Approve** | none | "Third-party verifier approved" |
| 12 | VVB | **Emission reductions (ERR)** → *Ex Post* row, **Verification Report** column | Load the report → submit. Then, on **Verification reports**, **Assign** it to the PP | `6_Verification_Report.json` | Report "Waiting for Approval". ER calculated is preset to 1556.947181 and ER verified is pre-filled with the same value. The ERR becomes "Verification submitted" |
| 13 | SR | **Monitoring reports**, then **Verification reports** | **Approve** both | none | Both "Registry approved" |
| 14 | PP | **Verification reports** → **Request VCU issuance** | Load the request → submit | `7_VCU_Issuance_Request.json` | Verification Report "VCU requested"; the request shows under **VCU requests** as "Waiting for issuance" |
| 15 | SR | **Issue VCUs** | **Issue VCUs** on the request row | none | **1556 VCU** minted to the PP; request "Issued". Trust chain and VPs show the full chain |

### Ex-post ERR row (step 9)

| Column | Value |
|---|---|
| BE total | 1558.271693 |
| PE total | 1.324512 |
| Ex-post ER final | **1556.947181** |
| Ex-ante for the period | 1666.620262 |
| Difference | −6.58 % |
| Calculation flags | empty |

### If something is rejected

Every **Reject** button (VVB and Standard Registry, on PDs, MRs, Validation and Verification Reports) asks for a reason. The reason appears in the **Reviewer comment** column of that document's grid, for the author and for the reviewer.

### Monitoring period length

The MR engine counts the days from the period start and end dates, inclusive. For the sample, 2027-01-01 to 2027-12-31 gives 365 days. If the typed number of days differs, the dates are used and a calculation flag says so.

### Appendix 2 "Single value" fields

Some parameters are entered twice: per section or per fuel in "Appendix 2 (continued): VMR0015 data and parameters by project section and fuel" (the last part of the PD and MR), and as one "Single value" in Appendix 2 (m, P_y, QPW_y, fNRB, Adj_LE, the fuel factors, COEF, the SDW checks). The calculation uses the records. If the Appendix 2 value differs (by more than 0.5 %), a calculation flag names both numbers; the ER does not change. The sample values agree, so no flag appears.

### Several fuels, loads or plants (TOOL03 and VT0010)

Appendix 2 A2.2.2 has a table **"TOOL03 per fuel and source"**. Enter one row per fuel i and combustion source j, with its COEF option: A (carbon fraction, Eq.(2) mass or Eq.(3) volume) or B (NCV × EF_CO2, Eq.(4)). PE_FF is the sum over the rows (TOOL03 Eq.(1)). A dedicated generator that supplies the project (VT0010 Scenario D, off-grid or back-up) is entered here as a source, because VT0010 s5.4.1.1 calculates it with TOOL03.

A2.2.3 has two tables:
- **"VT0010 per grid load"**: one row per load L, giving EC_Grid,L, TDL and, for a purpose-built wheeling arrangement, EG_PBWA, TDL_PE,B and EF_PE,B (Eq.(5), (7)-(9)). An empty EF_PE,A,L uses the value in A2.1.3.
- **"VT0010 per shared plant and fuel"**: one row per fuel f of each plant n (Eq.(11), (13), (14)). The plant values (EC_PE,SPP,n, EG_n, HG_n, η_cogen) are read from the plant's first row.

When a table is filled it replaces the single values above it, and a flag appears if both are filled. EC_PE,B is calculated from EG_PBWA (Eq.(9)). A typed EC_PE,B without EG_PBWA is not used, and a flag says so.

### Water metered on a sample (QPW option 1)

AMS-III.AV table 10 allows metering of all appliances, a statistically valid sample (continuously or over a representative period), or a kiosk meter. On each option 1 record, choose the **sampling basis**. For a sample record, also give the **appliances covered**, and for a representative period the **days measured**. In the MR section, give the **appliances in service** and, optionally, the appliance-days in service (the default is appliances × days in the period).

The section volume is calculated as follows:
- **Continuous sample:** metered litres × appliances in service / appliances metered.
- **Representative period:** metered litres / metered appliance-days × appliance-days in service.
- **All appliances, or a kiosk:** added as measured.

Use one basis per section; a section that mixes bases is not credited until it is corrected. Add a sampling record for the parameter QPW_y.

### Interactive effects and survey values (VMR0015 s9.3)

Enter the interactive-effects survey result in the baseline survey (PD) and in the project survey (MR): households surveyed and households reporting an interactive effect. The calculation reduces baseline emissions by that share, BE × (1 − share). With two surveys, the larger share applies. η_wb and X_boil come from each section's own baseline-survey rows. A section without rows uses the whole survey, and with no survey rows at all, the Appendix 2 values apply.

### Public network (AMS-III.AV table 13)

When a section's network check finds a public safe-water network, give the persons connected and the **date of supply**. Those persons are excluded from that date to the end of the period. Without a date, they are excluded for the whole period.

### Typed figures

The PD 1.1 estimates, the 1.10 vintage table and totals, the 4.5.2 table and the MR 5.5.2 and 5.5.3 tables are typed by the proponent. The calculation checks them against its own results and flags any difference above 1 t or 0.5 %; it never uses the typed figure.

### Shared power plant (VT0010)

If the project draws electricity from a shared plant and Appendix 2 gives the plant's fuel use, NCV, CO2 factor and generation (Q_n,f, NCV_f, EF_CO2,f, EG_n), the plant's emission factor is calculated with VT0010 Eq.(13), and with Eq.(14) when cogeneration heat (HG_n, η_cogen,n) is given. A typed factor that differs by more than 1 % is flagged. The sample uses no shared plant.

### If "Issue VCUs" refuses

The validator names the failed condition. Issuance needs all of the following:

| Document | Required state |
|---|---|
| Verification Report | "VCU requested", conclusion **Verified** |
| VCU request | ER verified > 0 and ER calculated > 0, matching the Verification Report |
| PD | "Registered" |
| Validation Report | "Registry approved" with opinion **Validated** |
| MR | "Registry approved" |
| ERR | "Verification submitted", with ER_final_total equal to the ER calculated on the request |

The mint amount is `floor(min(ER verified, ER calculated))`.

**Once only:**
- VCUs are issued at most once per monitoring report. The issuance check refuses a request when VCUs were already issued for the same MR, and the request form refuses a second request while one is waiting or issued.
- After a verification report is written, the ERR leaves "Calculated", so a second verification of the same MR is not possible. The Administrator can re-open the ERR only after its verification was rejected, and only while no other verification report of that MR is pending, approved or used for issuance.
- A monitoring period may not overlap another report of the same project that is approved or still under review, and a monitoring report ID, a verification report ID and a project ID can each be used once.
- The prechecks of the verification report and the VCU request run before anything is saved, so a refused form changes no status.

## Hand calculation of the sample

These are VMR0015 Eq.(1) and AMS-III.AV Eq.(5), with VT0010 for grid electricity.

| Term | Value | Source |
|---|---|---|
| SEC = 357.48 / n_wb | 357.48 / 0.15 = **2383.2 kJ/L** | AMS-III.AV Eq.(5), defaults |
| Fuel term = BL × (EF_CO2 × fNRB + EF_nonCO2) | 0.85 × (112 × 0.62 + 9.46) = **67.065** | VMR0015 Eq.(1); EF 112 and 9.46 from VMR0015 s9.1. fNRB 0.62 is a test value chosen for this sample, not a published TOOL33 figure; a real PD enters the current TOOL33 value for its country (s9.2 option 3) |
| Factor per litre (without m) = X_boil × SEC × fuel × 10⁻⁹ × Adj_LE | 0.88 × 2383.2 × 67.065 × 10⁻⁹ × 0.95 = **0.000133617301** | Adj_LE 0.95 is the AMS-I.E default. VMR0015 s8.3 and AMS-III.AV s5.4 (para 21) only send leakage to AMS-I.E; VMR0015 requires the factor to be set at validation |
| PE = EC × EF_grid × (1 + TDL) | 2.92 MWh × 0.42 × 1.08 = **1.324512 t** | VT0010 scenario A |

| Zone | PD: Q (L) × m 0.95 → BE | MR: Q (L) × m 0.93 → BE | MR cap: P × 5.5 L × 365 |
|---|---|---|---|
| S1 Kibosho | 4,000,000 → 507.745746 | 3,960,000 → 492.085798 | 2,955 × 5.5 × 365 = 5,932,162 L (not binding) |
| S2 Uru | 3,500,000 → 444.277527 | 3,410,000 → 423.740548 | not binding |
| S3 Old Moshi | 3,140,000 → 398.580410 | 2,880,000 → 357.880580 | not binding |
| S4 Mbokomu | 2,500,000 → 317.341091 | 2,290,000 → 284.564767 | not binding |
| **Total BE** | **1667.944774** | **1558.271693** | |
| **ER = BE − PE** | **1666.620262** | **1556.947181** | LE = 0 (s8.3) |

The MR monitoring factor m comes from a random sample of 100 appliances per zone. In each zone, 93 met all three AMS-III.AV table 11 criteria: 5 were not operating and 2 failed E. coli. So m = 0.93.

The E. coli failure share is 2/95 = 2.1 %, below the 10 % gate. The policy divides by the appliances that were tested (95), not all 100 checked; table 11 does not set the denominator, and the smaller one gives the higher, more cautious share. With 100 it would be 2.0 %; the result is the same. The 90/10 sampling target was met (4.5 % attained), so no discount applies. The public-network check found 0 persons, and the table 14 water-quality checks passed in all zones.

## Trying other cases

`tools/regression.py` changes the sample MR and compares the policy's own calculation with an independent implementation. It covers:
- E. coli failures above 10 % in one section, and over 10 % of the whole project
- a working appliance with no E. coli result
- a failed table 14 check in one section (the whole period is voided: "if project activity fails")
- a public network that supplies 739 persons (a quarter) of one zone: those persons are excluded under table 13; 25 % is only the test input, not a rule
- the 5.5 L cap
- the sampling discount in survey years 1–2, and in year 3 no credit for the submitted sample: the discount is not available after year 2 (Sampling standard para 18(c)), so the proponent must collect a supplemental or new sample (para 18(a)) and the section is credited once that sample meets 90/10
- a sample size below 30
- an unknown section ID
- a duplicate section ID

To see any of these in the UI, edit the same field in `4_Monitoring_Report.json`.
