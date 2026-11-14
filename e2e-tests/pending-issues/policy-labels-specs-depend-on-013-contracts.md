# `025_policy_labels` specs depend on data that `013_contracts` creates

**Status:** open, test problem (checked on 14 Nov 2026 on a local Solo stack with an empty database)
**Component:** `e2e-tests/cypress/e2e/api-tests/025_policy_labels`
**Severity:** medium — run on its own or before `013_contracts`, the folder fails 3 of 9 specs, and `08_postDocument`, the only one that submits a document through a policy label, never reaches its request
**Found by:** running `000_accounts_creating` and then only `025_policy_labels`

## What was observed

After `000_accounts_creating` on an empty database, `npm run guardian:test -- 'cypress/e2e/api-tests/025_policy_labels/*.cy.js'` passes 6 specs and fails 3, each in its `before all` hook:

| Spec | Error |
|---|---|
| `02_getPolicyLabelRelationships` | `the policy backing label …: expected undefined not to be undefined` |
| `07_getTokensPolicyLabel` | `expected [] not to be empty` |
| `08_postDocument` | `TypeError: Cannot read properties of undefined (reading 'id')` |

The same three fail with the same errors whether the Kubo daemon runs `--offline` or not.

## Why

The specs run as `Registrant` (`Cypress.env('User')`) against the published `iRec_4` policy that `cy.getOrCreateIRec4Policy` returns, but nothing in the folder prepares what they read:

- **The policy is not assigned to `Registrant`.** `Registrant` only sees the policies assigned to it: on that database `GET /policies` as `Registrant` listed 5 of the 9 published policies, not `iRec_4`, and the user had no assignment. `02` looks the label's policy up in that list. In a full run `013_contracts/012_enableAndDisableWipeRequests.cy.js` assigns it (`POST permissions/users/<User>/policies/assign/`, line 132).
- **The policy has minted no tokens.** `07` reads the tokens of the published label and expects at least one; `08` takes its document from them. On an empty database nobody has run the `iRec_4` flow up to the mint.

Assigning `iRec_4` to `Registrant` with the same request as `013/012` and re-running the folder makes `02` pass; `07` and `08` still fail with the errors above.

## How to reproduce

1. Empty database, stack up (`npm run guardian:status` all OK).
2. `npm run guardian:test -- 'cypress/e2e/api-tests/000_accounts_creating/*.cy.js'`
3. `npm run guardian:test -- 'cypress/e2e/api-tests/025_policy_labels/*.cy.js'`

## Test impact

The folder only passes after `013_contracts` in the same database, which `AGENTS.md` forbids (specs in different folders must not depend on each other). The fix belongs in `025` itself: assign the policy to the user and drive the `iRec_4` flow to a minted token in its own setup.
