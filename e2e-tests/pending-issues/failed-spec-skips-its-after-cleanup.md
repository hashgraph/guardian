# A failed test skips the `after` cleanup of its spec

**Status:** open, test tooling (seen on 14 Nov 2026 on a local Solo stack)
**Component:** `e2e-tests/cypress/support/e2e.js`
**Severity:** low — a failed run leaves the data its spec creates; the next runs of the folder may read it
**Found by:** running `009_policies/conditionalSchemaValidation.cy.js` against a build without the fix it covers

## What was observed

`cypress/support/e2e.js` stops the whole run when a test fails:

```js
afterEach(function () {
  if (this.currentTest.state === 'failed') {
    Cypress.stop();
  }
});
```

`conditionalSchemaValidation.cy.js` deletes its dry-run policy (and with it its schemas) in an `after` hook. In two runs where a test failed, the remaining tests were reported as skipped and the policy was not deleted: `conditionalValidation538897104` and `conditionalValidation274009825` stayed in `DRY-RUN`. In the runs where every test passed, nothing was left.

## How to reproduce

Make any test of a spec with an `after` cleanup fail (for example an assertion that cannot hold), run the spec and look for the entities its `after` hook deletes.

## Test impact

Every spec that cleans up in `after` leaves its data behind when one of its tests fails, so a red run can change what the next runs of the folder find (lists that a spec reads by position, names assumed unique). The remaining tests of the spec are skipped too, so a run shows only the first failure.
