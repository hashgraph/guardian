# Reviewer Cover Note — VMR0015 v1.0 Safe Drinking Water dMRV

**Author:** Bikram Biswas · **Bounty:** DLT Earth Methodology Bounty Program
**Methodology:** VMR0015 *Revision to AMS-III.AV.*, v1.0 (Verra, active since 31 Oct 2025, Sectoral Scope 3)

This note orients reviewers in ~2 minutes. Full detail is in [`README.md`](./README.md).

## What’s in the folder (everything in one place)
- **`VMR0015.policy`** — the Guardian policy import package (version 2.0.0). Implements the **real AMS-III.AV. equations** on-chain (BE from methodology parameters; `ER = BE − PE − LE`) with a water-quality gate. Dry-run validated (evidence in `tests/`).
- **`VMR0015_policy.json`** — readable policy config (review without importing).
- **`schemas/`** — all **17 schemas** as standalone JSON (extracted from the binary, identical to it) + an index.
- **`formulas/`** — the **formula linked definitions** artifact (`VMR0015_formula.zip`) + readable `formula.json` + docs.
- **`tests/`** — canonical test data + dry-run validation evidence (recording + signed publish credential).
- **`README.md` / `CHANGELOG.md`** — Verra alignment, scope of what is/isn’t implemented on-chain, and the change history.

## Both formula artifacts are present and describe the same math
- **Formula calculation block** — `calculate_report_fields` inside `VMR0015.policy` (executes the math at submission).
- **Formula linked definitions** — `formulas/VMR0015_formula.zip` (importable; each variable links to the exact Monitoring Report field). Both target the same Monitoring Report schema (`#db884e2d`).

## What to review (in order)
1. **`VMR0015.policy`** — import and run (Dry Run is enough).
2. **`tests/VMR0015_VCS3599_monitoring_report.json`** — submit as a Monitoring Report; confirm it computes `field3` (BE) and `field6` (ER) = **154,125.14** (rounded to **154,125**).
3. **`tests/VMR0015_dryrun_record.record`** + **`VMR0015_dryrun_publish_proof.csv`** — the policy-integrity / dry-run evidence (see below).
4. **`formulas/`** — confirm the formula linked definitions match the calculation block.
5. **`README.md`** — Verra methodology alignment and scope.

## Expected calculation (real AMS-III.AV. equations)
Submitting the test Monitoring Report computes:
```
SEC  = 357.48 / nwb                                                       [Eq.5]
BE_y = QPW_y * m * X_boil * SEC * (BL_fuel * f_i * EF_fuel * 1e-9)       [Eq.1]
ER_y = BE_y - PE_y - LE_y                                                 [Eq.7]
```
With the real VCS 3599 fixture values for 01/01/2025–30/06/2025 (2025H1):
```
BE_y = 162,241.14 tCO₂e
PE_y = 0 tCO₂e
LE_y =  8,116.00 tCO₂e
ER_y = 154,125.14 tCO₂e → mints 154,125 CER
```
These values are taken directly from the project’s ER calculation workbook
(`VCS-ERS-Project-3599-01JAN2025-30JUN2025.xlsx`, sheet `Total ER`) and
match the Verra Registry issuance record for this period.

### Parameter sources
- `QPW_y`, `m`, `X_boil` and appliance pass-rate: VCS 3599 ER spreadsheet (sheets `Py and check PWSS`, `m and water quality`, `Day-boarding`, `Boarding`, `Institution`).
- `nwb` (baseline appliance efficiency) and `f_i` (fNRB): AMS-III.AV. Table 3 and TOOL33 Vietnam defaults, as used in the ER spreadsheet.
- `EF_fuel` = 81.6 tCO₂/TJ: AMS-I.E. Table 2 / IPCC Tier 1 NRB, used in the ER spreadsheet.
- `BE_y`, `LE_y`, `ER_y`: totals from `Total ER` sheet for 2025H1.

## Three things to know before testing
- **Real methodology math, no blanket discount.** Baseline emissions are derived from AMS-III.AV. parameters (Eq. 1/5), not entered as a lump sum. The earlier fixed ×0.89 multiplier has been **removed** — AMS-III.AV. does not mandate one; conservativeness is carried by the `m` term and the water-quality gate.
- **Water-quality gate at the methodology’s real threshold.** ER is zeroed when more than 10% of appliances fail (pass-rate < 0.90), computed from the report’s passing/total appliance counts, fail-closed on missing data.
- **Test data — real Verra project and real ER spreadsheet totals.** The fixture is grounded in registered Verra project **VCS 3599 — Safe Drinking Water for Schools in Viet Nam** (methodology AMS-III.AV.), monitoring period 01/01/2025–30/06/2025. Registry: https://registry.verra.org/app/projectDetail/VCS/3599. The BE, LE, and ER values in the test Monitoring Report are taken directly from the project’s ER calculation spreadsheet and match the Verra Registry issuance for this period.

## Policy-integrity / dry-run evidence
This policy was imported, dry-run, and **published** on a Guardian testnet instance:
- `tests/VMR0015_dryrun_record.record` — the Guardian recording (its 17 project-schema IDs match this policy 17/17).
- `tests/VMR0015_dryrun_publish_proof.csv` — the signed `PUBLISH` Verifiable Credential (Ed25519, Hedera testnet DID) for `VMR0015 v1.0 Safe Drinking Water dMRV`, version 2.0.0.
- - **Earlier AI-generated `tc1` .record/expected files were removed** because their block tags and schema IDs did not match this policy. The current `tests/VMR0015_dryrun_record.record` and `tests/VMR0015_dryrun_publish_proof.csv` were regenerated from this `VMR0015.policy` (17 schemas) and verified against the schema UUID list in `tests/README.md`. See CHANGELOG [2.0.0] "Removed" section for context.

## What changed in this update (v2.1.1)
- **Removed dormant `uncertaintyDiscount` field** from `ER_Summary` schema end-to-end (properties, required array, JSON-LD context). The field’s description “Fixed 0.89 per VMR0015” was factually incorrect; AMS-III.AV. mandates no blanket multiplier.
- **Canonical fixture updated to real VCS 3599 data for 2025H1.** Expected result is now **154,125.14 tCO₂e (rounded to 154,125)**, matching the project’s ER spreadsheet and Verra Registry issuance, instead of the earlier illustrative 53,309.84 tCO₂e default-parameter fixture.
- **Rebuilt the calculation on the real AMS-III.AV. equations** (SEC = 357.48/nwb; BE = QPW·m·X_boil·SEC·(BL_fuel·f_i·EF_fuel·1e-9); ER = BE−PE−LE).
- **Set the water-quality gate to the methodology’s real >10%-fail threshold** (pass-rate < 0.90 → ER = 0), fail-closed.
- **Bundled dry-run validation evidence** (recording + signed publish credential).
- **Aligned all documentation** (README, CHANGELOG, tests, formulas) to the real equations and cited the primary UNFCCC AMS-III.AV. source alongside Verra and the project’s ER spreadsheet.

## Sources
- VMR0015 v1.0 — https://verra.org/methodologies/vmr0015-revisiontoams-iii-av-low-greenhouse-gas-emitting-safe-drinking-water-production-systems-v1-0/
- AMS-III.AV. v9.0 (primary; Eq. 1/5/7, Table 3, 357.48 constant) — https://cdm.unfccc.int/sunsetcms/storage/contents/stored-file-20250506190351296/MP97_EA06_AMS-III.AV_v09.0.pdf
- AMS-III.AV. original (357.48 derivation) — https://cdm.unfccc.int/sunsetcms/storage/contents/stored-file-20180620192618906/Annex%209%20-%20AMS-III.AV.pdf
- VCS 3599 ER spreadsheet — VCS-ERS-Project-3599-01JAN2025-30JUN2025.xlsx (sheet `Total ER`)
- Verra Registry — https://registry.verra.org/app/projectDetail/VCS/3599
