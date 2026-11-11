# ESLint findings in the Cypress suites, and how to fix them

**Status:** open. `cypress/unsafe-to-chain-command` and `cypress/no-unnecessary-waiting` are at zero; the style findings below are still pending.
**Component:** `e2e-tests/cypress/e2e`, `e2e-tests/cypress/support`
**Severity:** low

Measured with `npx eslint cypress` from `e2e-tests`: 19 findings on 11 Nov 2026. The generated folders (`cypress/reports`, `cypress/test_results`, `cypress/screenshots`, `cypress/downloads`) are excluded in `eslint.config.mjs`.

| Rule | Count | Where | Fix |
|---|---|---|---|
| `no-unused-vars` | 15 | `customLogicBlockValidation.cy.js` (4), `homePage.js` (3), `userPoliciesPage.js` (2), `editModules.cy.js` (2), `getSession.cy.js`, `002_getPolicyTestResult.cy.js`, `00_remotePolicyUserPreparing.cy.js`, `deleteModule.cy.js` | Delete the unused imports, variables and parameters. |
| `cypress/no-assigning-return-values` | 2 | `policySchemaPage.js` | A Cypress command returns a chainable, not a value: use `.then()` or an alias (`.as()` and `cy.get('@name')`). |
| `max-len` | 2 | `putActiveSystemSchema.cy.js`, `putUpdateSystemSchema.cy.js` (700-character lines) | Build the schema document as an object and `JSON.stringify` it (as `support/CustomHelpers/systemSchemas.js` does) or move it to a fixture. |

## Rules already at zero, keep them there

- `eqeqeq`, `no-useless-escape`, `no-dupe-keys` and `no-dupe-class-members`: use `===`, no needless backslashes, no duplicate object keys or class members.
- `cypress/unsafe-to-chain-command`: a command that changes the subject (`click`, `clear`, `type`, `blur`, `invoke`) must not be followed by another chained command; re-query instead (`cy.get(selector).clear(); cy.get(selector).type(value);`).
- `cypress/no-unnecessary-waiting`: wait for the condition, never for a fixed time. Take budgets from `support/CustomHelpers/timeouts.js` (`TIMEOUTS.ui`, `TIMEOUTS.backend`, `TIMEOUTS.longOperation`), poll backend state with `pollUntil` (`support/checkingMethods.js`), wait for a policy block with `waitForBlockAvailable`, and for UI state use a retrying `cy.get(..., { timeout }).should(...)`. Polling loops pause `POLL_INTERVAL` between two reads; the only fixed pause left is the 1 s in `waitForTaskComplete`, silenced with a reason.
