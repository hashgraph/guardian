# VM0033 archives cannot be published: a schema field key contains a dot

**Status:** open for the library archive `Methodology Library/Verra/Verified Carbon Standard (VCS)/VM0033/VM0033.policy`; worked around in the e2e fixture
**Component:** `guardian-service` — `schema-field-key-validator.ts` (rejects `.` and `:` in field keys on import and publish, feat #6620); content of the VM0033 archive
**Severity:** medium — the library's own VM0033 policy imports but `PUT /policies/{id}/publish` answers 500
**Found by:** `e2e-tests/cypress/e2e/api-tests/009_policies/VM033.cy.js`

## Symptom

Importing the archive works (once its tool references are remapped, see the CDM specs), publishing fails:

```
PUT /policies/{id}/publish -> 500
Field key "3.1.3.5_buffer_zones" (CCB & VCS Project Description > 3.1.3.5 Buffer Zones) contains reserved character ".".
Field keys must not contain reserved characters such as "." or ":".
```

## Where it comes from

The key `3.1.3.5_buffer_zones` appears in two schemas of the archive (four occurrences in each schema file) and nowhere else: not in `policy.json`, not in the project payload the spec posts. Both `VM0033.policy` in the library and the e2e fixture `VM0033_7_23.policy` carry it. The validator was added after the archives were exported.

## Fix

- Library: rename the key (for example `3_1_3_5_buffer_zones`) in the two schemas and re-export the archive. Whether existing published policies that use the dotted key need a migration is a product decision.
- E2E fixture: done — the key was renamed in the two schema files of `cypress/fixtures/VM0033_7_23.policy`.

## Test impact

With the fixture fixed, `VM033.cy.js` gets through import, publish and assign. It then stops at `Create application`, which is the separate, still open problem in `vm0033-project-creation-stalls-in-the-step-chain.md`.
