# VM033: the validation and verification report fixtures do not match the VM0033 schemas

**Status:** open, test data (not a product defect)
**Spec:** `cypress/e2e/api-tests/009_policies/VM033.cy.js` — the four tests from `Create validation report` to `Approve verification report` are skipped (`it.skip`) with a pointer to this note.
**Fixtures:** `cypress/fixtures/valrep.json`, `cypress/fixtures/verrep.json` (last changed in 3.4.0-rc, `ac3de6e6c8`)

## What was observed

`VM033` passes up to `Verify report` (13 tests), then `Create validation report` answers 422:

```
POST /policies/{id}/tag/add_new_validation_report/blocks -> 422
JSON_SCHEMA_VALIDATION_ERROR ... must have required property 'projectTitle'
```

The spec never got this far before (it stopped at publish, then at `Create application`), so the fixtures were never checked against the current policy.

## Why

The two fixtures were written for an older version of the VM0033 schemas:

- `VVB Validation Report` (`#f4722f99-…` in `VM0033_7_23.policy`) requires `projectTitle`, `accountId` and `field0`. The fixture has `field0` and `field1`, but the schema has no `field1`. The report content now goes in `vcs_validation_report` (when `field0` is `VCS v4.4`) or `ccb_vcs_validation_report`. Those sub-schemas require fields the fixture does not have (`G206`, `G227`, `G231`, …), and the fixture has keys they do not define (`G103`, `G104`, …).
- `VVB Verification Report` has the same shape. Its `vcs_verification_report` sub-schema requires `monitoringReportId`, `monitoringReportName` and `reportName`, which the fixture does not have.

## How to reproduce

Run `VM033.cy.js` with its tag (it is not tagged `all`, so `npm run guardian:test` filters it out): `CYPRESS_grepTags=VM0033` with the environment of `scripts/local-guardian.sh test`. Then un-skip `Create validation report`.

## What a fix needs

Two report documents that are valid for the current schemas, with `projectTitle` and `accountId` taken from the project the report references. They can come from a regenerated fixture, or from the schema at run time (the UI's "Dry run with test data" uses `DocumentGenerator` from `@guardian/interfaces`). Then un-skip the four tests, run the spec twice, and delete this note.
