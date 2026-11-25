# MGS round 4: results and file audit (21 Oct 2026)

**How it was run:** on MGS (Guardian 3.7.1-rc) through its API, following `MGS_CHECKS_RUNBOOK.md`. The returned recordings and exports were then checked separately, as set out below. README "Not done yet", item 1 says how to re-run a test in two minutes.

## 1. Results reported from MGS

| Check | v5.0A | v5.0B |
|---|---|---|
| Ex Ante ERR right after the PD | 1,666.620262475, no flags, Calculated | same |
| Clean run: Ex Post ERR, mint | 1,556.947181413, 1,556 VCU | same |
| Policy Integrity Test | **100 %**, 13 of 13 documents | **100 %**, 13 of 13 documents |
| MGS policy id | `6ad7bd3b72c7fd6f7400e32b` | `6ad7bfa672c7fd6f7400f636` |

Follow-up checks on v5.0B, after the test:

| Check | Result |
|---|---|
| ERR after a rejected verification | Stays listed; re-open moves it to Calculated |
| Second issuance (VER-2028-001b, ER verified 1,600) | 1,556 minted, total 3,112 (min(ERverified, ERcalculated)) |
| Re-open after issuance | Refused; status unchanged; total stays 3,112 |
| Second VCU request | Refused (HTTP 422); total stays 3,112 |
| VCU request made immediately after approval | Minted |
| Validation report with a wrong VVB ID | Refused (HTTP 422, `DOCUMENT_VALIDATOR_BLOCK_ERROR`); nothing saved |

## 2. What was checked in the returned files

| Check | How | Result |
|---|---|---|
| The exports are the policies as built | Block tree compared with every generated id removed and schema and token references replaced by name (`tools/audit/compare_export_blocks.py`); every schema compared field by field (`tools/audit/compare_export_schemas.py`) | Block tree identical. 478 / 411 schemas, every field identical. One difference, made by Guardian on import: it re-writes schema conditions and adds an `else` that forbids `ecoliCfu` when the appliance is not operating (`schema-helper.ts`, 3.7.1-rc, `buildForbid`). This matches the condition's meaning |
| The test inside each export is the recording | sha256 of `tests/*.record` against the separate recording | Identical: A `c6071b4885a32e68…`, B `e00d2997670c6824…` |
| The recordings are clean runs | `tools/audit/read_record.py` | Each starts from a new dry-run: 2 new users, 23 block actions from Choose Role to `admin_err_issue_button`, 201–208 s |
| The recorded documents | Same script | 12 VCs + 1 VP = the 13 documents the test compares. Ex Ante 1,666.620262475, Ex Post 1,556.947181413, `dataQualityFlags` empty in both, mint amount 1,556. Template version v5.0A in A, v5.0B in B |
| Re-exports `_3` / `_4` | Same comparison | The same MGS policies and the same test files as the `after_test` exports |

Not checked from files: the 100 % score itself. Guardian keeps test results in its database, not in the export, so the score is seen by re-running the test on MGS (README "Not done yet", item 1).

## 3. Notes

- **Wrong-VVB-ID message wording.** See `MGS_CHECKS_RUNBOOK.md`, round 4. The policy was not changed for this, since a change would alter both files and need new recordings.
- **Test names.** MGS names a test after the uploaded file ("VMR0015_v5"); rename in Test Details if wanted. It has no effect on the result.
- **Status.** Both MGS policies were exported in dry-run. Nothing is published to testnet.
