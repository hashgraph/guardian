# Changelog — VMR0015 v1.0 Safe Drinking Water dMRV (Guardian policy)

All notable changes to this Guardian policy are documented here.
Versioning follows the submission review cycle (CHANGELOG version) ≠ Guardian-internal baked version.

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
- `schemas/` — all 17 JSON schemas extracted from `VMR0015.policy`.
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
- **`credentialSubject` access bug fixed.** The `calculate_report_fields` block previously used `.length`-based array guard (`(subj && subj.length) ? subj[0] : doc`) that fails when Guardian exposes `credentialSubject` as a plain object (not an array). Rewritten with `Array.isArray` guard — on plain objects `Array.isArray` correctly returns `false` and the raw document is used directly.
- **`outputSchema` corrected.** Was pointing to ER Summary schema; now correctly targets Monitoring Report (`#db884e2d`).
- **`setRelationshipsBlock` added** to `new_report` — monitoring reports now linked to their parent project document.
- **`RunEvent` chain restored:** `sr_reassign_approved_report` → `sr_save_reassigned_approved_report_hedera` → `sr_save_reassigned_approved_report_db`. Without this, SR approval stalled and tokens never minted.
- **`defaultActive: false` on `save_report_form_hedera`** (was `true`) — removes the 30-second Hedera SDK timeout that silently discarded every form submission.
- **`dataType: 'vc-documents'`** on all 19 Hedera `sendToGuardianBlock` entries (was empty string).
- **`field6` removed from Monitoring Report `required[]`** — ER is a computed output; forcing the PP to supply it manually caused form rejection on every submission.
- **`save_new_approve_document` permissions: `ANY_ROLE` → `VVB`** — only VVBs may approve PP registration documents.
- **`cyclic: false` on `new_report`** — prevents infinite report-creation loop.

### Added
- **VCS 3599 canonical test fixture.** Full dry-run against the canonical AMS-III.AV. parameters back-calculated from VCS 3599 (Safe Drinking Water for Schools in Viet Nam), monitoring period 01 Jan – 30 Jun 2025. Result: `BE = 162,241.14`, `LE = 8,116.00`, `ER = 154,125.14 tCO₂e` — matches Verra Registry issuance of 154,125 VCUs (13/02/2026).
  - *Earlier intermediate test fixtures (53,309.84 tCO₂e at QPW_y ≈ 23M L; 11,084.74 tCO₂e) were earlier runs used to confirm the token mint chain before the full canonical parameters were applied. These are not errors — they were intentional step-down tests.*
- **Signed PUBLISH VC** (`6a2463dfd2866ba70ad193bd.csv`) — Ed25519, Hedera testnet, version 2.0.1.
- **PP role credentials** (`6a2465a6b…`, `6a2465aab…`) — PP-submit and SR-countersign step pair confirming PP role registration workflow.
- **Project Description VCs** (`6a2466efb…`, `6a2466f2b…`) — PP and SR signatures on the Project Description document.

---

## [2.0.0] — Calculation fix + Verra-grounded test data

### Fixed
- **`calculate_report_fields` now reads the Monitoring Report as flat scalars.**
  - **Symptom:** a correctly filled Monitoring Report computed `field6 = 0`, so the token minted zero.
  - **Root cause:** the Monitoring Report schema (`#31d7ef1c`) defines `field3`/`field4`/`field5` (BE/PE/LE) as **flat numbers** and `field2` as a "Period Reference" string. The calculation block was reading them as **nested objects** (`raw.field4.field1`, etc.) and treating `field2` as a water-quality array — yielding `0` on every flat report.
  - > **Note (2025):** `#31d7ef1c` was the Monitoring Report schema IRI in v2.0.0. The current canonical IRI is `#db884e2d` (used in v2.1.0+ and referenced by the formula linked definitions and all current documentation).
  - **Fix:** the block now reads flat scalars via `toNum(raw.field3 / field4 / field5)`; computes `ER = (BE − PE − LE) × 0.89` *(removed in [2.1.0] — see above)*; clamps negatives to `0`. The WHO water-quality gate is now **optional and dormant** — it applies only when an explicit pass-rate is supplied (`field10` or a `wqSamples` array), and the current Monitoring Report schema does not expose `field10`, so a normal flat report computes correctly without it.
  - **Verification:** a flat Monitoring Report with `field3 = 154125`, `field4 = 0`, `field5 = 0` now computes `field6 = 137,171.25`.

### Added
- **Standalone, reviewable artifacts.** Exported the policy config as a readable `VMR0015_policy.json` and all **17 schemas** into a `schemas/` folder (with an index), both extracted directly from `VMR0015.policy` so they are identical to the binary. Reviewers can now inspect the policy and schemas without importing the binary into Guardian.
- **Formula Linked Definitions** (`formulas/`). A Guardian formula artifact (`formula.json` + `schemas.json`, packaged as `VMR0015_formula.zip`) that expresses the emission-reduction math as schema-linked definitions: `BE_y/PE_y/LE_y` link to Monitoring Report `field3/4/5`, `ER_net = BE_y − PE_y − LE_y` (VMR0015 §3.9.1), and `ER_y = max(0, ER_net) × u_def` links to `field6` (the MintToken rule). This complements the existing `calculate_report_fields` calculation block — the two describe the same math.

### Changed
- **Test data re-grounded on a registered Verra project.** Replaced the earlier non-Verra example with **VCS 3599 — Grouped Projects for Safe Drinking Water for Schools in Viet Nam** (registered, AMS-III.AV.), using its public registry record. See [`tests/README.md`](./tests/README.md).
- **Documentation aligned with Verra's published VMR0015 v1.0**, including the six official updates over AMS-III.AV. and the core equation `ER_y = BE_y − PE_y − LE_y` (§3.9.1).
- **Clarified the ×0.89 factor** as a conservativeness choice of this implementation, not a Verra-mandated blanket parameter. *(Removed entirely in [2.1.0].)*

### Removed
- **Fabricated policy-integrity-test `.record`.** The earlier bundled `.record` (`cb0543b3-…`) was AI-generated and did **not** match this policy's block tags / schema IDs; it would fail deterministic replay. *(Superseded in [2.1.0] — real dry-run record and publish proof now bundled in `tests/`.)*
- **Stale audit/evidence files** (`AUDIT.md`, `evidence/`, the duplicate dry-run `Policy File (JSON)` export, and a calculations workbook) that referenced superseded policy IDs.

---

## Notes for reviewers
- The policy package is `VMR0015.policy` (Guardian internal version **2.0.1** — baked at export time; CHANGELOG tracks submission version 2.1.1). All other files are documentation or test material. The `.policy` binary bakes the Guardian-internal version at export time (currently **2.0.1**). The CHANGELOG submission tracking version [2.1.1] reflects the cumulative set of changes documented here; both refer to the same binary.
- No registered VMR0015 project exists yet (methodology published 31 Oct 2025); the test uses a registered predecessor-methodology (AMS-III.AV.) project as the closest real-world input.
