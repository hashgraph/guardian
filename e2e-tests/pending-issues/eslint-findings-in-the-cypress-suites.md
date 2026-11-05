# ESLint findings in the Cypress suites, and how to fix them

**Status:** open — `cypress/unsafe-to-chain-command` is fixed (25 → 0); everything below is still pending.
**Component:** `e2e-tests/cypress/e2e`, `e2e-tests/cypress/support`
**Severity:** low for the style rules; medium for the fixed waits, which make runs slow and flaky

Measured with `npx eslint cypress/e2e cypress/support` from `e2e-tests` (172 findings on 5 Nov 2026). Running `npx eslint cypress` also lints `cypress/reports` and `cypress/test_results`, which are generated and git-ignored: that adds roughly 10,000 findings of pure noise (the bundled report app), so lint the two source folders only, or exclude the generated ones in `eslint.config.mjs` (a tooling change that needs approval).

## Fixed waits (`cypress/no-unnecessary-waiting`, 91 findings)

There are 123 `cy.wait(<milliseconds>)` calls and 13 with a variable duration under `cypress/e2e` and `cypress/support`; 23 of them are silenced with an `eslint-disable-next-line` and a reason (the pacing of self-scheduling polls) and 91 are flagged. The most frequent numeric durations are 5000 ms (44 calls), 2000 ms (14), 8000 ms and 3000 ms (12 each) and 1000 ms (10). Where they are:

| File | Findings |
|---|---|
| `api-tests/027_dryrun_savepoints/001_savepointFlow.cy.js` | 23 |
| `support/checkingMethods.js` | 13 |
| `api-tests/016_policies_tests_and_flows/dryRunPolicyFlowAndRecord.cy.js` | 11 |
| `ui-tests/pages/intaller-page.js`, `authentication.js`, `projectProponent.js`, `verra.js` | 8, 6, 6, 6 (legacy pages built on `mat-*` markup, not yet converted) |
| the rest | scattered, 4 or fewer per file (e.g. `tableFieldValidation.cy.js`) |

A fixed wait is either too short (flaky) or too long (slow), and it hides what the test is actually waiting for. How to replace each kind:

- **Waiting for an HTTP call to land:** register `cy.intercept(method, url).as('name')` before the action and `cy.wait('@name')` after it (`cy.wait('@alias')` is already used 18 times in 4 files).
- **Waiting for the UI to settle:** assert on the state instead (`cy.get(...).should('be.visible' | 'not.exist' | 'have.value', ...)`), or use the readiness helpers in `support/pageReadiness.js` and `support/importFlow.js`.
- **Waiting for a backend task or a balance:** poll for the condition. `waitForLoading` and `waitForBalanceIncrease` in `support/checkingMethods.js` poll with a `cy.wait(interval)` between attempts; keep one pause per loop, document it with a single `eslint-disable-next-line` and a reason (as `configPage.generateHederaAccount` does), or move the polling into `should()` callbacks that retry on their own.
- **Waiting for a page that has no signal yet** (the legacy `mat-*` pages): the conversion to the current UI removes the wait together with the old selectors, so convert those pages first.

## Other findings

| Rule | Count | Where | Fix |
|---|---|---|---|
| `no-unused-vars` | 30 | `customLogicBlockValidation.cy.js` (5), `homePage.js`, `userPoliciesPage.js` (3 each), `standardRegistrySetHederaCreds.cy.js`, `authentication.js`, `intaller-page.js`, `editModules.cy.js` (2 each), others | Delete the unused imports, variables and parameters. |
| `eqeqeq` | 29 | `userPoliciesPage.js` (9), `policySchemaPage.js` (4), `deleteRole.cy.js`, `setDefault.cy.js`, `01_remotePolicyPreparing.cy.js`, `modulesPage.js` (2 each), others | Use `===` / `!==`; check that both sides have the same type first (attribute values are strings). |
| `no-useless-escape` | 8 | `putUpdateSchema.cy.js`, `schemaManage.cy.js` (4 each) | Drop the backslash before `"` inside single-quoted strings. |
| `cypress/no-assigning-return-values` | 5 | `policySchemaPage.js` (4), `verra.js` | A Cypress command returns a chainable, not a value: use `.then()` or an alias (`.as()` and `cy.get('@name')`). |
| `no-dupe-keys` | 4 | `putUpdateSchema.cy.js`, `schemaManage.cy.js` (2 each, key `entity`) | Remove the duplicate; the later one wins today, so keep that value. |
| `curly` | 2 | `putPoliciesId.cy.js`, `putPolicy.cy.js` | Add braces to the `if`. |
| `max-len` | 2 | `putActiveSystemSchema.cy.js`, `putUpdateSystemSchema.cy.js` (700-character lines) | Build the schema document as an object and `JSON.stringify` it (as `support/CustomHelpers/systemSchemas.js` does) or move it to a fixture. |
| `no-dupe-class-members` | 1 | `userPoliciesPage.js` (`createGroup`) | Remove the dead first definition; the later one wins today. |

## Already fixed: `cypress/unsafe-to-chain-command` (25 → 0)

A command that changes the subject (`click`, `clear`, `type`, `blur`, `invoke`) must not be followed by another chained command: re-query instead.

```js
// before
cy.get(selector).clear().type(value);
// after
cy.get(selector).clear();
cy.get(selector).type(value);
```
