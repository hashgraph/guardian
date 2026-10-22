# VMR0015 v3.2: backup with the fNRB input checks closed

**The submission is v3.1**, the two policy files in `policy/` one level up. They are unchanged.

This folder holds v3.2, a backup of the same policy. It closes two input-check gaps in the fNRB determination (VMR0015 s9.2), found in a review after v3.1 was submitted. Everything else is v3.1:
- the same workflow and the same 219 blocks
- the same schemas and templates
- the same token and mint rule
- the same results on the sample: 1,666.620262475 t CO2e/yr ex-ante, 1,556.947181413 t CO2e ex-post, 1,556 VCU

Use v3.2 only if the reviewers ask for these checks to be enforced inside the policy. Adding this folder changed no other file in the package.

## What v3.2 closes

VMR0015 v1.0 s9.2 (p.11), data/parameter f<sub>NRB,i,y</sub>: "Where the baseline fuel is woody biomass, one of the following sources must be used: 1) Most recent national default values published by the UNFCCC 2) Calculated based on CDM TOOL30 and applying an uncertainty discount of 26% 3) Default value from the most recent version of CDM TOOL33". The data unit is given as "Fraction or %".

| Case | v3.1 | v3.2 |
|---|---|---|
| Options 1 and 3: "f_NRB applied" filled in and different from the UNFCCC or TOOL33 value | The typed applied value is used, with no flag | The UNFCCC or TOOL33 value is used and the difference is flagged |
| Options 1 and 3: source value missing, applied value given | The applied value is used, with no flag | The applied value is used and flagged ("enter the source value; VVB to confirm") |
| Option 2: applied value different from TOOL30 × 0.74 | The computed value is used, with no flag | The computed value is used and the difference is flagged |
| Option 1: UNFCCC value outside 0–1, e.g. 62 entered as a percentage | Used as it is | The calculation is voided and the value listed, as for the other fNRB fields |

A difference of 0.005 or less is not flagged, the same tolerance as the existing fuel-row fNRB check.

**What this means in numbers.** On the sample monitoring report, where the correct result is 1,556.947181 t CO2e:

| Input | v3.1 result | v3.2 result |
|---|---|---|
| Option 3, applied 0.70 vs TOOL33 0.62 | 1,733.906806 t, no flag | 1,556.947181 t, flagged |
| Option 1 in the PD, applied 0.70 vs UNFCCC 0.62 | ex-ante 1,856.034523 t/yr, no flag | ex-ante 1,666.620262 t/yr, flagged |
| Option 1, UNFCCC value typed as 62 | **137,329.219078 t** | 0, voided, value listed |
| Option 3 with only the applied value 0.62 | 1,556.947181 t, no flag | 1,556.947181 t, flagged |
| Option 2, applied 0.70 vs TOOL30 × 0.74 = 0.444 | 1,167.636008 t, no flag | 1,167.636008 t, flagged |

With the inputs as entered in the samples (option 3, the same 0.62 in both fields), neither version flags anything and both give the same result.

## What changed in the files

Only the code of the two mathBlocks, `pp_err_calculation_pd_vcs_ex_ante` and `pp_err_calculation_mr_vcs_ex_post`. The change is identical in both blocks and in both template sets:
- `fnrbOf` is split into `fnrbSrc` (the value from the selected option's source) and `fnrbOf` (source value first, the applied value only as a flagged fallback for options 1 and 3).
- One range check is added, for the UNFCCC value.

Each block loses 5 lines and gains 24. The script that made the change is `tools/patch_fnrb.py`; it stops if any text it replaces does not occur exactly once.

Compared with the v3.1 files in `policy/`, ignoring the IDs, dates and names MGS assigns on every import (`tools/compare_policies.py`):

| Part | v3.1 → v3.2 |
|---|---|
| Block tree (219 blocks: type, tag, nesting) | identical |
| Every block setting other than the mathBlock code | identical |
| Schemas (478 in v5.0A, 411 in v5.0B), 14 system schemas | identical |
| Token: VCU VMR0015, non-fungible, 0 decimals | identical |
| Roles, workflow, mint rule `min(ERverified, ERcalculated)` | identical |
| mathBlock code | the fNRB change above |

The schema Excel exports in `schema_excel/` match the v3.1 ones in `reference/schema_excel/` cell for cell, apart from the schema UUIDs.

## Capabilities

The same as v3.1, plus the fNRB checks above.

| | |
|---|---|
| Methodology | Verra VMR0015 v1.0 with CDM AMS-III.AV v09.0 (low-GHG safe drinking water production systems) |
| Workflow | PP and VVB accounts → Project Description, ex-ante ER calculated → VVB validation and Validation Report → registration, only after the registry has approved a validation report with the opinion Validated → Monitoring Report, ex-post ER calculated → Verification Report → registry approval → VCU request by the project proponent → issuance and mint |
| Roles | Project Proponent, VVB; the Standard Registry owns the policy |
| Calculation | Two mathBlocks, run section by section (VMR0015 s9.3(2)): VMR0015 Eq.(1) with the CO2/non-CO2 split, Adj_LE (s8.3) and the fNRB options (s9.2); AMS-III.AV Eq.(2)–(5), the para 18 cap, table 10 sample metering, tables 11, 13 and 14; CDM TOOL03; VT0010 v1.1, which replaces TOOL05 (VMR0015 s8.2); the CDM Sampling Standard v09.0 (minimum 30, 90/10, para 18 discount); the VT0008 and VMR0015 s7 additionality checks; usage-weighted η<sub>wb</sub>, X<sub>boil</sub> and the interactive-effects share (s8.1, s9.3) |
| Summation | Over any number of project sections, fuels, combustion sources, grid loads and shared plants |
| Data quality | Every data issue the calculation finds is written to the ERR's data-quality flags. Impossible inputs (fractions outside 0–1, negative quantities, duplicate records, an applicability condition not met) void the calculation |
| Guards | A project ID is used by one project description; a monitoring period may not overlap another approved or pending report of the same project; a monitoring report ID is used once; the verification and VCU-request prechecks run before any status change; VCUs are issued at most once per monitoring report; an ERR is re-opened only after its verification was rejected |
| Mint | floor(min(ER verified by the VVB, ER calculated)), token VCU VMR0015, non-fungible, 0 decimals |
| Templates | VCS v5.0A file: projects with a start date before 1 January 2027. VCS v5.0B file: projects starting on or after 1 January 2027, and earlier projects at their next crediting period renewal or verification with a baseline reassessment submitted on or after 1 January 2030 (Verra, VCS Version 5 resources, FAQ 3) |
| Guardian | 3.7.0 or later; uses no feature missing from 3.7.1-rc, the Managed Guardian Service build |

## Test results

All results are for both v5.0A and v5.0B. The outputs are in `test-output/`.

| Check | v3.1 (submitted) | v3.2 (this folder) |
|---|---|---|
| `tools/regression.py`, the package's 60 cases | 60/60 | 60/60 |
| `tools/regression_v3.2.py`, the 60 cases plus 5 fNRB cases | 60/65: the 5 fNRB cases fail, as they should | **65/65** |
| `tools/guardian_math/sim.mjs`, whole workflow replay | 94/94 | 94/94 |
| `tools/guardian_math/formulas_check.mjs` | 18/18 (PD), 19/19 (MR) | 18/18, 19/19 |
| `tools/audit/blocks_audit.py` | 0 problems in 219 blocks | 0 problems in 219 blocks |
| `tools/wiring.py` | 0 problems | 0 problems |
| Policy Integrity Test on MGS | 100 % | 100 % |

`regression_v3.2.py` is the v3.1 `tools/regression.py` with two changes:
- the independent fNRB rule now follows s9.2, with the source value governing
- the 5 fNRB cases are added

It runs on Guardian's own math engine through the package's `tools/guardian_math`.

**MGS.** Both v3.2 files were imported into MGS (Guardian 3.7.1-rc) and dry-run with the sample documents. The Policy Integrity Test scored 100 % on both, and each file was exported with its test (`..._with_integrity_test.policy`; the recording is also in `evidence/`). The documents MGS produced during the run, compared with the v3.1 run field by field (`tools/compare_mgs_runs.py`):

- **Identical:** PP and VVB profiles, Project Description, Monitoring Report, both ERRs (ex-ante 1,666.620262475; ex-post 1,556.947181413, no flags), the Validation Report and the mint of 1,556 VCU.
- **Verification Report and VCU request:** the ERverified value was typed as 1556.947181413, where the v3.1 run typed 1556.947181. Both mint 1,556.
- **Extra in the v3.2 run:** a 2028 monitoring report and its ERR (1,556.947181413, with the expected flag that the leap year has 366 days). No second mint.

Guardian keeps the integrity-test score on the server, not in the exported file. To see it yourself, import a `..._with_integrity_test.policy` file, open Test Details and press Run.

## Files

| File | sha256 |
|---|---|
| `VMR0015_Safe_Drinking_Water_dMRV_v3.2_VCS-v5.0A_with_integrity_test.policy` | `20d5c8b04bfb9e5bc84b3318a831ec78107313c72ed4b7bd8a70d58a7311c5f9` |
| `VMR0015_Safe_Drinking_Water_dMRV_v3.2_VCS-v5.0B_with_integrity_test.policy` | `086d5b1bfccc7b6cb776ea0fcad04a500f93ad18215858b990f5aa686b9f1f0c` |
| `without_integrity_test/VMR0015_Safe_Drinking_Water_dMRV_v3.2_VCS-v5.0A.policy` | `1539d95d0c5de984164bc1776ef9a567696109cd9dcce6d8a70fc09413efc7c7` |
| `without_integrity_test/VMR0015_Safe_Drinking_Water_dMRV_v3.2_VCS-v5.0B.policy` | `93e3ad5476481e8b20cf373d78575201f889e89d887c13e59c79f4950bafe105` |
| `schema_excel/VMR0015_v3.2_v5.0A_schemas.xlsx` | `6c126154d3fbf83f46e8c2eac7fb55baf6a1b4413f298876a3c4e8e642196d0b` |
| `schema_excel/VMR0015_v3.2_v5.0B_schemas.xlsx` | `64087ad6f66f47e3176281633f9e3e45a30c2d95eedd80a6e0b507f20877393b` |
| `evidence/VMR0015_v3.2_v5.0A_integrity_test_run.record` | `12736d6963f7220b55776243288c4240f44d57d3267878cb522ac7b0fc9d84ed` |
| `evidence/VMR0015_v3.2_v5.0B_integrity_test_run.record` | `c265d32951996d26b32df68d02c7fe54f65263c073261e9cdfd687daa4fc8dc3` |
| `tools/regression_v3.2.py` | The regression with the 5 fNRB cases |
| `tools/patch_fnrb.py` | The change, as a script, with the commands that made the v3.2 files |
| `tools/compare_policies.py` | Compares two `.policy` files, ignoring the IDs, dates and names MGS assigns |
| `tools/compare_mgs_runs.py` | Compares the documents two MGS test runs produced |
| `test-output/` | The output of every check above |

The `without_integrity_test/` files are the policies as built, before the MGS import, like `policy/without_integrity_test/` for v3.1. The MGS exports carry the name MGS gave them on import, e.g. `VMR0015 Safe Drinking Water dMRV (VCS v5.0A)_1792616721930`, because the v3.1 policy of the same name was already imported. The as-built files carry the plain name.

## Re-run the checks

From the package root, once:

```
(cd tools/guardian_math && npm install)
```

The engine also needs `tools/guardian_math/dist/`. The repository's `.gitignore` (`dist/`) kept it out of the v3.1 commit, so a separate commit adds it, unchanged from the package as built. The same commit fixes the path of the log file `sim.mjs` writes, which failed in folders whose names contain spaces. If `dist/` is ever missing, rebuild it with `npx tsc -p .` in that folder. `tsc` reports one type error (`Cannot find module 'node:crypto'`: `@types/node` is not installed) but still writes `dist/`. Then:

```
N=policy/v3.2_backup/VMR0015_Safe_Drinking_Water_dMRV_v3.2_VCS-v5.0B_with_integrity_test.policy      # or ..._VCS-v5.0A_... with tools/fixtures/v5.0A/
O=policy/VMR0015_Safe_Drinking_Water_dMRV_v3.1_VCS-v5.0B_with_integrity_test.policy
python3 policy/v3.2_backup/tools/regression_v3.2.py $N tools/fixtures/PD.full.json tools/fixtures/MR.full.json   # 65/65
python3 policy/v3.2_backup/tools/regression_v3.2.py $O tools/fixtures/PD.full.json tools/fixtures/MR.full.json   # 60/65, the 5 fNRB cases fail
python3 tools/regression.py $N tools/fixtures/PD.full.json tools/fixtures/MR.full.json                           # 60/60
python3 policy/v3.2_backup/tools/compare_policies.py $O $N
python3 policy/v3.2_backup/tools/compare_mgs_runs.py $O $N
mkdir /tmp/p && (cd /tmp/p && unzip -q $OLDPWD/$N) && node tools/guardian_math/sim.mjs /tmp/p sample-data/v5.0B   # 94/94
```

## If the reviewers ask for the fix

1. Replace the two files in `policy/` with the two `..._with_integrity_test.policy` files here.
2. Replace the two files in `policy/without_integrity_test/` with the two here.
3. Replace `tools/regression.py` with `tools/regression_v3.2.py`, keeping the name `regression.py`.
4. Update the package README: the four sha256 values, the version (v3.1 to v3.2), "60/60" to "65/65", and a line pointing to this folder.
