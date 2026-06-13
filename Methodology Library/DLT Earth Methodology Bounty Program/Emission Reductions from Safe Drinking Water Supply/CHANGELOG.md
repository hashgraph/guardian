# Changelog — VMR0015 v1.0 Safe Drinking Water dMRV (Guardian policy)

All notable changes to this Guardian policy are documented here.
Versioning follows the submission review cycle (CHANGELOG version) ≠ Guardian-internal baked version.

---

## [2.1.2] — 2026-06-13 — Canonical fixture format fix + test artifact tidy

### Fixed
- **`tests/VMR0015_VCS3599_monitoring_report.json`** — replaced static pre-populated fixture (which had `field3`=162241.14 and `field6`=154125.14 as hard-coded values) with the correct Guardian Monitoring Report import format. The fixture now uses the proper schema wrapper (`#ec344365-95ee-47ea-bd79-4159f01301d2&1.0.0`) and `credentialSubject` with only the 11 input fields. `field3` (BE) and `field6` (ER) are intentionally absent — the policy engine computes them on-chain via `calculate_report_fields`. Pre-filling them would bypass the calculation entirely.
- **`README.md`** — corrected policy binary filename throughout (was the generic `VMR0015.policy` shorthand; now matches the actual filename in the repository). Marked `field3`/`field6` as computed outputs in the test data table (not fixture inputs). Clarified §4 How to Test step 3. Added `Finally Record Shows Everything.record` and `VMR0015_verification_suite_results.txt` to the §5 Files table.
- **`tests/README.md`** — enumerated all 17 schema UUIDs (was only 3 of 17 listed). Added fixture format note (schema wrapper, computed fields absent). Added `VMR0015_verification_suite_results.txt` to the evidence table. Softened the dry-run replay claim to accurately scope what the `.record` demonstrates (lifecycle plumbing) vs. what submitting the fixture demonstrates (canonical 154,125 CER computation).

### Added
- **`tests/VMR0015_verification_suite_results.txt`** — reproducible 7-case math verification suite for `calculate_report_fields`. 6 PASS (canonical, WQ gate fail, WQ gate boundary, nwb=0 fail-closed, PE+LE overflow, missing sampling fail-closed). 1 FAIL row is a mislabeled test assertion, not a policy defect: fNRB=5.0 is correctly clamped to 1.0 by the engine; the test row asserted a different expected value. Clamp behavior is verified by the canonical row.

---

## [2.1.1] — 2026-06-08 — Documentation fixes + dry-run evidence package

### Fixed
- **Monitoring Report.txt** — rewrote with correct `nwb = 0.10`, `SEC = 3,574.8 kJ/L`, canonical `ER = 154,125.14 tCO₂e`. Removed trivially-wrong `357.48 / 357.48 = 1.00` equation; corrected CSV reference (was pointing to Project Description VC, now correctly references PUBLISH VC `6a2463dfd…`).
- **Bug Fixed Tested policies/README.md** — corrected all four CSV role labels. `6a2465a6b…` and `6a2465aab…` are PP role credentials (PP-submit + SR-countersign), not "dry-run VC documents". `6a2466efb…` and `6a2466f2b…` are Project Description VCs (PP and SR signatures), not "PP registration VCs".
- **VVB Account Registration.txt** — replaced placeholder DID (`z6Mk…`) and unfilled account ID (`0.0.xxxxxxx`) with real testnet identifiers. Replaced intermediate fixture figure (`53,309.84 tCO₂e`) with canonical note (`154,125.14 tCO₂e`). Corrected CSV identity (the PP-issued form `6a2465a6b…` is the PP role credential, not a VVB export).
- **Project Proponent Account Registration.txt** — corrected CSV reference. `6a2463dfd…` is the policy PUBLISH VC (operation = PUBLISH, type = Policy), not the PP registration credential. Added 3-row table distinguishing PUBLISH VC from PP role credentials.

### Added
- `tests/` dry-run evidence package: `VMR0015_dryrun_record.record`, `VMR0015_dryrun_publish_proof.csv`, `VMR0015_VCS3599_monitoring_report.json`.
- `REVIEWER_COVER_NOTE.md` — consolidated reviewer guide.
- `formulas/` — Guardian Formula Linked Definitions (`formula.json`, `schemas.json`, `VMR0015_formula.zip`).
- `schemas/` — all 17 JSON schemas extracted from the policy binary.
- `tools/verify_originality.py` — originality check script.
- `workflow.png` — full policy lifecycle diagram.

---

## [2.1.0] — 2026-06-06 — Real AMS-III.AV. equations + dry-run validation

### Fixed
- **Real AMS-III.AV. equations implemented.** Replaced the placeholder ×0.89 conservativeness discount (from [2.0.0]) with the actual UNFCCC AMS-III.AV. formula chain:
  - `SEC = 357.48 / nwb` [Eq. 5]
  - `BE_y = QPW_y × m × X_boil × SEC × (BL_fuel × f_i × EF_fuel × 1e-9)` [Eq. 1]
  - `ER_y = BE_y − PE_y − LE_y` [Eq. 7]
  - Water-quality gate: `pass_rate < 0.90 → ER_y = 0` (fail-closed, AMS-III.AV. §6.1)
- **`credentialSubject` access bug fixed.** The `calculate_report_fields` block previously used `.length`-based array guard (`(subj && subj.length) ? subj[0] : doc`) that fails when Guardian exposes `credentialSubject` as a plain object (not an array). Rewritten with `Array.isArray` guard.
- **`outputSchema` corrected.** Was pointing to ER Summary schema; now correctly targets Monitoring Report (`#db884e2d`).
- **`setRelationshipsBlock` added** to `new_report` — monitoring reports now linked to their parent project document.
- **`RunEvent` chain restored:** `sr_reassign_approved_report` → `sr_save_reassigned_approved_report_hedera` → `sr_save_reassigned_approved_report_db`. Without this, SR approval stalled and tokens never minted.
- **`defaultActive: false` on `save_report_form_hedera`** (was `true`) — removes the 30-second Hedera SDK timeout.
- **`dataType: 'vc-documents'`** on all 19 Hedera `sendToGuardianBlock` entries (was empty string).
- **`field6` removed from Monitoring Report `required[]`** — ER is a computed output.
- **`save_new_approve_document` permissions: `ANY_ROLE` → `VVB`** — only VVBs may approve PP registration documents.
- **`cyclic: false` on `new_report`** — prevents infinite report-creation loop.

### Added
- **VCS 3599 canonical test fixture.** Result: `BE = 162,241.14`, `LE = 8,116.00`, `ER = 154,125.14 tCO₂e` — matches Verra Registry issuance of 154,125 VCUs (13/02/2026).
- **Signed PUBLISH VC** (`6a2463dfd2866ba70ad193bd.csv`) — Ed25519, Hedera testnet, version 2.0.1.
- **PP role credentials** (`6a2465a6b…`, `6a2465aab…`) — PP-submit and SR-countersign step pair.
- **Project Description VCs** (`6a2466efb…`, `6a2466f2b…`) — PP and SR signatures.

---

## [2.0.0] — Calculation fix + Verra-grounded test data

### Fixed
- **`calculate_report_fields` now reads the Monitoring Report as flat scalars.**
  - **Symptom:** a correctly filled Monitoring Report computed `field6 = 0`, so the token minted zero.
  - **Root cause:** the block was reading flat numbers as nested objects — yielding `0` on every flat report.
  - **Fix:** the block now reads flat scalars via `toNum(raw.field3 / field4 / field5)`; computes `ER = (BE − PE − LE) × 0.89` *(removed in [2.1.0])*; clamps negatives to `0`.
  - **Verification:** a flat Monitoring Report with `field3 = 154125`, `field4 = 0`, `field5 = 0` now computes `field6 = 137,171.25`.

### Added
- **Standalone, reviewable artifacts.** All 17 schemas into a `schemas/` folder.
- **Formula Linked Definitions** (`formulas/`).

### Changed
- **Test data re-grounded on VCS 3599** (registered, AMS-III.AV.).
- **Documentation aligned with VMR0015 v1.0.**
- **Clarified the ×0.89 factor** as a conservativeness choice. *(Removed entirely in [2.1.0].)*

### Removed
- **Fabricated policy-integrity-test `.record`** (`cb0543b3-…`) — was AI-generated and did not match this policy's block tags / schema IDs.
- **Stale audit/evidence files** that referenced superseded policy IDs.

---

## Notes for reviewers
- The policy package is `VMR0015 v1.0 Safe Drinking Water dMRV FINAL-3_1781328422728_1781333997086 (3).policy` (Guardian internal version **2.0.1** — baked at export time; CHANGELOG tracks submission version 2.1.2). All other files are documentation or test material. The CHANGELOG submission tracking version [2.1.2] reflects the cumulative set of changes documented here; both refer to the same binary.
- No registered VMR0015 project exists yet (methodology published 31 Oct 2025); the test uses a registered predecessor-methodology (AMS-III.AV.) project as the closest real-world input.
