# Real-data test: a verified AMS-III.AV project run through the policy

## Which project, and why this one

**Nazava Water Filter Project, Indonesia (Gold Standard GS4290).** It applies AMS-III.AV v04.0. Its 1st monitoring period, 19/12/2015 to 18/12/2018, was verified by Bureau Veritas (report BVC/Brunei-VR/Brunei/003/2018 rev. 01). 28,879 t CO2e were verified.

- **No VMR0015 project exists yet.** No project is listed under VMR0015 on Verra's methodology page. VMR0015 has been active only since 31 Oct 2025, and AMS-III.AV is no longer a standalone VCS methodology.
- **This project's documents are public and complete.** Its verification report prints every parameter needed to recompute the verified result.
- **The other real AMS-III.AV data could not be read from here.** The CDM PoA 9948 monitoring reports (Impact Carbon) block automated readers. The Verra registry is behind a web app.

The test is not meant to show that the policy "matches" this project. The project used AMS-III.AV **v04.0**; the policy implements **VMR0015**, the revision of v09.0. The test does two things:
- it reproduces the verified arithmetic with the policy's own engine
- it shows, rule by rule, what VMR0015 changes for the same data

## Sources (anyone can check them)

| Document | Link |
|---|---|
| Verification report, MP1 (Bureau Veritas) | https://nazavawebsite-bucket.s3.ap-southeast-1.amazonaws.com/global/2024/01/24022829/GS4290-Nazava-Water-Filters-Indonesia-carbon-project-_Verification-Report_1st-monitoring-period_19.12.2015-to-18.12.2018_v1-1-1.pdf |
| Transition Annex (equations 3-6 and ex-ante parameters) | https://nazavawebsite-bucket.s3.ap-southeast-1.amazonaws.com/global/2024/01/24022839/GS4290_-Nazava-water-filters-indonesia-carbon-project-Transition-Annex_15.02.2016_v2.2-1.pdf |
| All project documents (PDD, monitoring reports, ER spreadsheets for MP1-MP3) | https://global.nazava.com/carbon-credits/ |
| Gold Standard registry record (cited in the verification report) | https://mer.markit.com/br-reg/public/project.jsp?project_id=103000000009787 |
| VMR0015 v1.0 | https://verra.org/methodologies/vmr0015-revisiontoams-iii-av-low-greenhouse-gas-emitting-safe-drinking-water-production-systems-v1-0/ |
| AMS-III.AV v09.0 | https://cdm.unfccc.int/sunsetcms/storage/contents/stored-file-20250506190351296/MP97_EA06_AMS-III.AV_v09.0.pdf |

## Inputs

| Parameter | Value | Source |
|---|---|---|
| Persons per operating filter N | 4.32 | Verification report s3.4 (project survey) |
| Water per person per day R | 3.5 L | Transition Annex s A.3 / C.1. The verification report's QPW of 4,320 L per unit-year = 4.32 × 3.5 × 365 × 0.8871 × 0.8826, which confirms it |
| Water-quality pass share | 88.71 % | Verification report s3.4 (mobile test kits) |
| X_boil | 0.8826 | Verification report s3.4 |
| η_wb | 0.4 | Verification report s3.4 |
| SEC | (4.186 × (100 − 20) + 0.01 × 2,260) / 0.4 = 893.7 kJ/L | Transition Annex Eq.(6); AMS-III.AV Eq.(4) |
| fNRB | 0.821 | Verification report s3.4 |
| EF | 81.6 t CO2/TJ, no non-CO2 term | Verification report s3.4 (AMS-I.E fossil-fuel substitute) |
| Leakage | × 0.95 | Verification report s3.4 / 3.6 |
| Project emissions | 0 | Verification report s3.6 |
| **Operating filters per vintage** | 24,744 / 30,407 / 41,410 / 46,378 | **Derived from the verified BE of each vintage** (see below) |

**The one derived input.** Neither document prints the number of operating filters per vintage. That number is in the monitoring report and the ER spreadsheet (links on the project page), which my tools could not open. It is therefore derived from each vintage's verified BE, so it does not test the sales and usage data. It is plausible against the verification report: 87,879 filters distributed by Dec 2018 at 66.05 % average usage gives about 58,000 operating at the end, against 46,378 on average over 2018. Uploading the MP1 monitoring report and the `Nazava_MP12018_ER_20190124.xlsx` spreadsheet closes this gap.

**How the data go into the policy.** One section. QPW option 2.2 (persons × 3.5 L × days). X_boil, η_wb and SEC are entered in Appendix 2. The fuel row uses fNRB 0.821, and Adj_LE is 0.95. For m, 10,000 appliance records reproduce the 88.71 % share. The 11.29 % that did not pass is read in two ways (see the results).

## Results: the policy's Guardian math engine, and the independent Python calculation in `tools/regression.py`

| Vintage | Verified ER | **A** VMR0015 rules, as reported (11.29 % fail E. coli) | **B** Arithmetic check (11.29 % not operating), EF 81.6 | **C** As B with VMR0015 s9.1 IPCC wood factors (112 + 9.46 t/TJ) |
|---|---|---|---|---|
| 19/12/2015–31/12/2015 | 217 | 0 | 216.60 | 327.88 |
| 2016 | 7,493 | 0 | 7,493.60 | 11,343.49 |
| 2017 | 10,177 | 0 | 10,177.35 | 15,406.03 |
| 01/01/2018–18/12/2018 | 10,992 | 0 | 10,992.45 | 16,639.89 |
| **Total** | **28,879** | **0** | **28,880.00** | **43,717.29** |

Engine and independent calculation agree to 0.001 t in every cell.

- **B reproduces the verified result.** Every vintage is within rounding. The 1 t difference in the total comes from the verifier rounding each vintage before adding (their vintage BE values also add to 30,400, against 30,399 reported). This checks that the policy chains the following the same way the verified project did: SEC Eq.(4)/(6), BE, fNRB, the 0.95 leakage factor (inside BE per VMR0015 s8.3, LE = 0), X_boil and m.
- **A is what VMR0015 requires.** AMS-III.AV v09.0 table 11(c) says: "Emission reductions cannot be claimed if over 10% of appliances in the project activity fail to meet the final water quality requirements". 11.29 % failed, so the policy credits nothing. Its flag reads: "1129 of 10000 appliances tested … (11.3 %) fail the E. coli requirement, over 10 % of the project activity (table 11 (c)) - no emission reductions". Under v04.0 that rule did not exist.
- **C shows the VMR0015 s9.1 emission factor.** VMR0015 Eq.(1) applies the baseline fuel's own factors: wood 112 t CO2/TJ plus a non-CO2 term. v04.0 used the AMS-I.E fossil-fuel substitute of 81.6. The ratio (112 × 0.821 + 9.46) / (81.6 × 0.821) = 1.514 is exactly the ratio of C to B.

Flags that remain, correctly: VMR0015 s9.3(1) requires an interactive-effects question in both surveys, and v04.0 had no such requirement. The policy says so and makes no adjustment.

## Reproduce

```
python3 tools/realdata/build_nazava.py tools/fixtures /tmp/nazava
python3 tools/realdata/run_nazava.py . <unzipped policy.json> /tmp/nazava    # needs tools/guardian_math installed (npm install)
```
