# `flow_CDM_0001`: the tool picker stays open after Select during the policy import

**Status:** open, cause not found (seen once on 14 Nov 2026 on a local Solo stack with the frontend on `ng serve`)
**Component:** `e2e-tests/cypress/support/importFlow.js` (`replaceInaccessibleTools`), `frontend` import preview (`search-tool-dialog`)
**Severity:** medium — the spec fails during the import, before the flow submits any document
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/02_policies/flow_CDM_0001.cy.js`

## What was observed

`flow_CDM_0001` failed after 1 min 19 s with:

```
AssertionError: Timed out retrying after 10000ms: Expected <search-tool-dialog> not to exist in the DOM, but it was continuously found.
    at importFlow.js:159
```

The CDM policy references its tools by testnet message ids, which do not resolve on a local network, so the import preview marks those rows invalid and `replaceInaccessibleTools` re-points each one at the same-named workspace tool: it opens the row's search, types the tool name, clicks `Select` on the matching row and expects the picker to close (`importFlow.js:150-159`). The picker was still open 10 s after the click.

The six other `02_policies` specs of the same run passed (`GeoJSONandIPFSFieldValidation`, `dryRunMint`, `iREC3`, `iREC4`, `iREC5Group`, `iREC7Split`). A re-run was stopped before it finished, and Cypress cleared the failure screenshot when it started, so which row and which tool were involved is not known.

## How to reproduce

Run `flow_CDM_0001.cy.js` on a local Solo stack (see "Preparing the app for UI tests" in the README) and watch the import step. Not reproduced on demand.

## Test impact

The spec stops before the CDM flow, so nothing after the import (custom logic, documents, tokens) is checked in that run.
