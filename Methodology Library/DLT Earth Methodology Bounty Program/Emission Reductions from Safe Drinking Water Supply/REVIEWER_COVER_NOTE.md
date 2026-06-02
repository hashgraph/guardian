# Reviewer Cover Note — VMR0015 v1.0 Safe Drinking Water dMRV

**Author:** Bikram Biswas · **Bounty:** DLT Earth Methodology Bounty Program
**Methodology:** VMR0015 Revision to AMS-III.AV., v1.0 (Verra, active since 31 Oct 2025)

## What to review
1. **`VMR0015.policy`** — the Guardian policy import (version 2.0.0). Implements VMR0015 ER = BE − PE − LE with a u_def = 0.89 conservativeness factor.
2. **`tests/VMR0015_VCS3599_monitoring_report.json`** — canonical test data, grounded in registered Verra project **VCS 3599** (Safe Drinking Water for Schools in Viet Nam), monitoring period 01/01/2025–30/06/2025, verified net ER ≈ 154,125 tCO2e. Registry: https://registry.verra.org/app/projectDetail/VCS/3599
3. **`README.md` / `CHANGELOG.md`** — methodology alignment with Verra's published VMR0015, plus the change history.

## Expected calculation
Submitting the test Monitoring Report (field3 = 154125, field4 = 0, field5 = 0) computes:
```
field6 = (154125 − 0 − 0) × 0.89 = 137171.25 tCO2e
```
matching VMR0015 §3.9.1 (ER = BE − PE − LE), intentionally more conservative than Verra's verified figure.

## Changes in this update
- **Fixed** the `calculate_report_fields` block: it now reads the Monitoring Report's flat numeric fields (field3/4/5) instead of nested objects. Previously a normal flat report computed field6 = 0 (minted zero). See `CHANGELOG.md`.
- **Removed** an earlier AI-generated `.record` integrity-test file: it did not match this policy's block tags / schema IDs and would fail on deterministic replay. A valid record requires a live Guardian dry-run (can be produced on request).
- **Re-grounded** test data on a real, registered **Verra** project (VCS 3599) instead of the earlier Gold Standard example, per reviewer guidance.

## Note on no registered VMR0015 project
VMR0015 v1.0 was published 31 Oct 2025; no project has completed registration under it yet. The test therefore uses a registered Verra project under the predecessor methodology AMS-III.AV. with its real verified figures — the closest acceptable input given the data gap.

## Sources
- VMR0015 v1.0 — https://verra.org/methodologies/vmr0015-revisiontoams-iii-av-low-greenhouse-gas-emitting-safe-drinking-water-production-systems-v1-0/
- VCS 3599 — https://registry.verra.org/app/projectDetail/VCS/3599
