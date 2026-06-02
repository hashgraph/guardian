# Reviewer Cover Note — VMR0015 v1.0 Safe Drinking Water dMRV

**Author:** Bikram Biswas · **Bounty:** DLT Earth Methodology Bounty Program
**Methodology:** VMR0015 *Revision to AMS-III.AV.*, v1.0 (Verra, active since 31 Oct 2025, Sectoral Scope 3)

This note orients reviewers in ~2 minutes. Full detail is in [`README.md`](./README.md).

## What's in the folder (everything in one place)
- **`VMR0015.policy`** — the Guardian policy import package (version 2.0.0). Implements the **real AMS-III.AV. equations** on-chain (BE from methodology parameters; `ER = BE − PE − LE`) with a water-quality gate. Dry-run validated (evidence in `tests/`).
- **`VMR0015_policy.json`** — readable policy config (review without importing).
- **`schemas/`** — all **17 schemas** as standalone JSON (extracted from the binary, identical to it) + an index.
- **`formulas/`** — the **formula linked definitions** artifact (`VMR0015_formula.zip`) + readable `formula.json` + docs.
- **`tests/`** — canonical test data + dry-run validation evidence (recording + signed publish credential).
- **`README.md` / `CHANGELOG.md`** — Verra alignment, scope of what is/isn't implemented on-chain, and the change history.

## Both formula artifacts are present and describe the same math
- **Formula calculation block** — `calculate_report_fields` inside `VMR0015.policy` (executes the math at submission).
- **Formula linked definitions** — `formulas/VMR0015_formula.zip` (importable; each variable links to the exact Monitoring Report field). Both target the same Monitoring Report schema (`#db884e2d`).

## What to review (in order)
1. **`VMR0015.policy`** — import and run (Dry Run is enough).
2. **`tests/VMR0015_VCS3599_monitoring_report.json`** — submit as a Monitoring Report; confirm it computes `field3` (BE) and `field6` (ER) = **11,084.74**.
3. **`tests/VMR0015_dryrun_record.record`** + **`VMR0015_dryrun_publish_proof.csv`** — the policy-integrity / dry-run evidence (see below).
4. **`formulas/`** — confirm the formula linked definitions match the calculation block.
5. **`README.md`** — Verra methodology alignment and scope.

## Expected calculation (real AMS-III.AV. equations)
Submitting the test Monitoring Report computes:
```
SEC  = 357.48 / nwb                                              [Eq.5]
BE_y = QPW_y * m * X_boil * SEC * (BL_fuel * f_i * EF_fuel * 1e-9) [Eq.1]
ER_y = BE_y - PE_y - LE_y                                        [Eq.7]
```
With the fixture values (QPW=2e8, m=0.95, X_boil=1.0, nwb=0.15, EF=81.6, f_i=0.30, BL_fuel=1.0):
`SEC = 2,383.2 kJ/L → BE = ER = 11,084.74 tCO₂e` (minted as 11,084.74 CER). Appliance pass-rate 95/100 ≥ 0.90, so the water-quality gate passes.

## Three things to know before testing
- **Real methodology math, no blanket discount.** Baseline emissions are derived from AMS-III.AV. parameters (Eq. 1/5), not entered as a lump sum. The earlier fixed ×0.89 multiplier has been **removed** — AMS-III.AV. does not mandate one; conservativeness is carried by the `m` term and the water-quality gate.
- **Water-quality gate at the methodology's real threshold.** ER is zeroed when more than 10% of appliances fail (pass-rate < 0.90), computed from the report's passing/total appliance counts, fail-closed on missing data.
- **Test data — real Verra project, illustrative parameters.** The fixture is grounded in registered Verra project **VCS 3599 — Safe Drinking Water for Schools in Viet Nam** (methodology AMS-III.AV.), monitoring period 01/01/2025–30/06/2025. Registry: https://registry.verra.org/app/projectDetail/VCS/3599 . The parameter values are illustrative inputs at the project's scale; they have not been independently re-derived from the project's issuance/monitoring PDF. Reviewers with registry access can substitute the exact verified parameters for a precise reconciliation. (VMR0015 v1.0 was published 31 Oct 2025; no project has completed registration under it yet, so a predecessor-methodology AMS-III.AV. project is the closest acceptable real-world input.)

## Policy-integrity / dry-run evidence
This policy was imported, dry-run, and **published** on a Guardian testnet instance:
- `tests/VMR0015_dryrun_record.record` — the Guardian recording (its 17 project-schema IDs match this policy 17/17).
- `tests/VMR0015_dryrun_publish_proof.csv` — the signed `PUBLISH` Verifiable Credential (Ed25519, Hedera testnet DID) for `VMR0015 v1.0 Safe Drinking Water dMRV`, version 2.0.0.

## What changed in this update
- **Rebuilt the calculation on the real AMS-III.AV. equations** (SEC = 357.48/nwb; BE = QPW·m·X_boil·SEC·(BL_fuel·f_i·EF_fuel·1e-9); ER = BE−PE−LE).
- **Set the water-quality gate to the methodology's real >10%-fail threshold** (pass-rate < 0.90 → ER = 0), fail-closed.
- **Removed the fixed ×0.89 discount**; expanded the Monitoring Report schema to capture the real parameters.
- **Bundled dry-run validation evidence** (recording + signed publish credential).
- **Aligned all documentation** (README, CHANGELOG, tests, formulas) to the real equations and cited the primary UNFCCC AMS-III.AV. source alongside Verra.

## Sources
- VMR0015 v1.0 — https://verra.org/methodologies/vmr0015-revisiontoams-iii-av-low-greenhouse-gas-emitting-safe-drinking-water-production-systems-v1-0/
- AMS-III.AV. (primary; Eq. 1/5/7, 357.48 constant) — https://cdm.unfccc.int/sunsetcms/storage/contents/stored-file-20180620192618906/Annex%209%20-%20AMS-III.AV.pdf
- VCS 3599 — https://registry.verra.org/app/projectDetail/VCS/3599
