# ESLint findings in the Cypress suites, and how to fix them

**Status:** open. `cypress/unsafe-to-chain-command` and `cypress/no-unnecessary-waiting` are at zero; the style findings below are still pending.
**Component:** `e2e-tests/cypress/e2e`, `e2e-tests/cypress/support`
**Severity:** low

Measured with `npx eslint cypress` from `e2e-tests`: 69 findings on 5 Nov 2026. The generated folders (`cypress/reports`, `cypress/test_results`, `cypress/screenshots`, `cypress/downloads`) are excluded in `eslint.config.mjs`.

| Rule | Count | Where | Fix |
|---|---|---|---|
| `eqeqeq` | 29 | `userPoliciesPage.js` (9), `policySchemaPage.js` (4), `01_remotePolicyPreparing.cy.js`, `deleteRole.cy.js`, `modulesPage.js`, `setDefault.cy.js` (2 each), others | Use `===` / `!==`; check that both sides have the same type first (attribute values are strings). |
| `no-unused-vars` | 21 | `customLogicBlockValidation.cy.js` (4), `homePage.js`, `userPoliciesPage.js` (3 each), `editModules.cy.js`, `standardRegistrySetHederaCreds.cy.js` (2 each), others | Delete the unused imports, variables and parameters. |
| `no-useless-escape` | 8 | `putUpdateSchema.cy.js`, `schemaManage.cy.js` (4 each) | Drop the backslash before `"` inside single-quoted strings. |
| `no-dupe-keys` | 4 | `putUpdateSchema.cy.js`, `schemaManage.cy.js` (2 each, key `entity`) | Remove the duplicate; the later one wins today, so keep that value. |
| `cypress/no-assigning-return-values` | 2 | `policySchemaPage.js` | A Cypress command returns a chainable, not a value: use `.then()` or an alias (`.as()` and `cy.get('@name')`). |
| `curly` | 2 | `putPoliciesId.cy.js`, `putPolicy.cy.js` | Add braces to the `if`. |
| `max-len` | 2 | `putActiveSystemSchema.cy.js`, `putUpdateSystemSchema.cy.js` (700-character lines) | Build the schema document as an object and `JSON.stringify` it (as `support/CustomHelpers/systemSchemas.js` does) or move it to a fixture. |
| `no-dupe-class-members` | 1 | `userPoliciesPage.js` (`createGroup`) | Remove the dead first definition; the later one wins today. |

## Rules already at zero, keep them there

- `cypress/unsafe-to-chain-command`: a command that changes the subject (`click`, `clear`, `type`, `blur`, `invoke`) must not be followed by another chained command; re-query instead (`cy.get(selector).clear(); cy.get(selector).type(value);`).
- `cypress/no-unnecessary-waiting`: wait for the condition, never for a fixed time. Take budgets from `support/CustomHelpers/timeouts.js` (`TIMEOUTS.ui`, `TIMEOUTS.backend`, `TIMEOUTS.longOperation`), poll backend state with `pollUntil` (`support/checkingMethods.js`), wait for a policy block with `waitForBlockAvailable`, and for UI state use a retrying `cy.get(..., { timeout }).should(...)`. Polling loops pause `POLL_INTERVAL` between two reads; the only fixed pause left is the 1 s in `waitForTaskComplete`, silenced with a reason.
