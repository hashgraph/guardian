# Reviewer Cover Note — VMR0015 v1.0 Safe Drinking Water dMRV

**Author:** Bikram Biswas · **Bounty:** DLT Earth Methodology Bounty Program
**Methodology:** VMR0015 *Revision to AMS-III.AV.*, v1.0 (Verra, active since 31 Oct 2025)

This note orients reviewers in ~2 minutes. Full detail is in [`README.md`](./README.md).

## What to review (in order)
1. **`VMR0015.policy`** — the Guardian policy import package (version 2.0.0). Implements the core ER equation `ER = BE − PE − LE` with a fixed ×0.89 conservativeness discount applied before minting.
2. **`tests/VMR0015_VCS3599_monitoring_report.json`** — canonical test data, grounded in registered Verra project **VCS 3599** (Safe Drinking Water for Schools in Viet Nam), monitoring period 01/01/2025–30/06/2025. Registry: https://registry.verra.org/app/projectDetail/VCS/3599
3. **`README.md` / `CHANGELOG.md`** — Verra alignment, scope of what is/ isn't implemented on-chain, and the change history.

## Expected calculation
Submitting the test Monitoring Report (`field3 = 154125`, `field4 = 0`, `field5 = 0`) computes:
```
field6 = (154125 − 0 − 0) × 0.89 = 137,171.25 tCO₂e
```
matching VMR0015 §3.9.1 (`ER = BE − PE − LE`).

## Three things to know before testing
- **The ×0.89 factor is a choice of this implementation**, not a Verra-mandated blanket parameter. It is documented in README §2 so you can adjust or remove it to match Verra's prescribed uncertainty treatment if required.
- **The 154,125 tCO₂e figure is an illustrative input** taken from VCS 3599's public registry record; it has not been independently re-derived here from the issuance/monitoring PDF. The exact verified figure can be substituted from the project's Verification Report.
- **No `.record` integrity file is bundled.** A valid one must come from a live Guardian dry-run of this policy (can be produced on request). An earlier AI-generated record was removed because it did not match this policy's block tags/schema IDs.

## What changed in this update
- **Fixed** the calculation block to read the Monitoring Report's flat numeric fields (`field3/4/5`) instead of nested objects — previously a normal report computed `field6 = 0` (minted zero). See `CHANGELOG.md`.
- **Re-grounded** the test data on a real, registered **Verra** project (VCS 3599).
- **Removed** the fabricated `.record` and stale audit/evidence files with broken internal references, leaving a clean policy + docs + test package.

## Note on no registered VMR0015 project
VMR0015 v1.0 was published 31 Oct 2025; no project has completed registration under it yet. The test therefore uses a registered project under the predecessor methodology AMS-III.AV. with its public figures — the closest acceptable real-world input given the data gap.

## Sources
- VMR0015 v1.0 — https://verra.org/methodologies/vmr0015-revisiontoams-iii-av-low-greenhouse-gas-emitting-safe-drinking-water-production-systems-v1-0/
- VCS 3599 — https://registry.verra.org/app/projectDetail/VCS/3599
