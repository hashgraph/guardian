# An active `USER` system schema left by the schema API tests breaks the UI registration specs

**Status:** open, test isolation problem (reproduced on 6 Nov 2026 on a local Solo stack)
**Component:** `e2e-tests/cypress/e2e/api-tests/011_schemas/putActiveSystemSchema.cy.js`; `api-gateway` — `src/api/service/schema.ts` (system schema routes)
**Severity:** medium — the UI registration specs fail after the API suite, so the suites depend on their order
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/00_account_registration/`

## What was observed

`putActiveSystemSchema.cy.js` creates a system schema for the `USER` entity and makes it active (`PUT /schemas/system/:schemaId/active`). It does not clean up.

An active `USER` system schema adds a document step to the user registration wizard, so the UI registration specs no longer find the "Confirm" button they expect:

```
AssertionError: Timed out retrying after 10000ms: Expected to find content: 'Confirm' within the selector: 'button' but never did.
    at runWizard (ui-tests/pages/configPage.js)
    at ConfigPage.hederaUserRegistration (ui-tests/pages/configPage.js)
```

The spec cannot undo what it did: the API refuses to update or delete an active system schema (`Schema is active.`, 422, in the `PUT /schemas/system/:schemaId` and `DELETE /schemas/system/:schemaId` handlers), and there is no route to deactivate one. A system schema only becomes inactive when another schema of the same entity is activated.

## How to reproduce

On a database with no active `USER` system schema, from `e2e-tests`:

1. `npx cypress run --spec cypress/e2e/api-tests/011_schemas/putActiveSystemSchema.cy.js` (plus the `--env` flags of the README): passes.
2. `npx cypress run --spec 'cypress/e2e/ui-tests/specs/00_account_registration/*.cy.js' --config baseUrl=http://127.0.0.1:4200`: `createAccount_Generate` and `createAccount_ProvideCredentials` fail with the error above (`createAccount_NonHappyFlows` passes).
3. Set `active: false` on the schema in `guardian_db.schema` (`{ system: true, active: true, entity: 'USER' }`) and run the two specs again: both pass.

## Test impact

A run of the UI suite after the API suite on the same database fails the two registration specs. Until this is fixed, run the UI `00` specs before `011_schemas`, or deactivate the schema in the database as in step 3.

## What a fix needs

Either the spec restores the previous state (for example by activating the schema that was active before, when there was one), or the API offers a way to deactivate a system schema so the spec can clean up after itself.
