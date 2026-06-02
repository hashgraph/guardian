# Changelog — VMR0015 v1.0 Safe Drinking Water dMRV (Guardian Policy)

All notable changes to this policy submission are documented here. Methodology
alignment, scope, and test instructions live in [`README.md`](./README.md).

---

## [2.0.0] — Calculation fix + Verra-grounded test data

### Fixed
- **`calculate_report_fields` now reads the Monitoring Report as flat scalars.**
  - **Symptom:** a correctly filled Monitoring Report computed `field6 = 0`, so the token minted zero.
  - **Root cause:** the Monitoring Report schema (`#8d8b1014`) defines `field3`/`field4`/`field5` (BE/PE/LE) as **flat numbers** and `field2` as a "Period Reference" string. The calculation block was reading them as **nested objects** (`raw.field4.field1`, etc.) and treating `field2` as a water-quality array — yielding `0` on every flat report.
  - **Fix:** the block now reads flat scalars via `toNum(raw.field3 / field4 / field5)`; computes `ER = (BE − PE − LE) × 0.89`; clamps negatives to `0`. The WHO water-quality gate is now **optional** — it applies only when an explicit pass-rate is supplied (`field10` or a `wqSamples` array) — so a normal flat report computes correctly.
  - **Verification:** a flat Monitoring Report with `field3 = 154125`, `field4 = 0`, `field5 = 0` now computes `field6 = 137,171.25`.

### Changed
- **Test data re-grounded on a registered Verra project.** Replaced the earlier non-Verra example with **VCS 3599 — Grouped Projects for Safe Drinking Water for Schools in Viet Nam** (registered, AMS-III.AV.), using its public registry record. See [`tests/README.md`](./tests/README.md).
- **Documentation aligned with Verra's published VMR0015 v1.0**, including the six official updates over AMS-III.AV. and the core equation `ER_y = BE_y − PE_y − LE_y` (§3.9.1).
- **Clarified the ×0.89 factor** as a conservativeness choice of this implementation, not a Verra-mandated blanket parameter.

### Removed
- **Fabricated policy-integrity-test `.record`.** The earlier bundled `.record` (`cb0543b3-…`) was AI-generated and did **not** match this policy's block tags / schema IDs; it would fail deterministic replay. A valid integrity-test record must be produced from a **live Guardian dry-run** of this policy and can be generated on request.
- **Stale audit/evidence files** (`AUDIT.md`, `evidence/`, the duplicate dry-run `Policy File (JSON)` export, and a calculations workbook) that referenced superseded policy IDs and deleted files — they no longer matched the current submission and were removed to keep the package easy to review.

---

## Notes for reviewers
- The policy package is `VMR0015.policy` (version 2.0.0). All other files are documentation or test material.
- No registered VMR0015 project exists yet (methodology published 31 Oct 2025); the test uses a registered predecessor-methodology (AMS-III.AV.) project as the closest real-world input.
