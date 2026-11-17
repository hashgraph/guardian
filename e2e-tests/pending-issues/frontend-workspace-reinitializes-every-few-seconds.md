# A policy block's loading overlay stays on and starves UI clicks

**Status:** open — narrowed down on 12 Nov 2026 and not pinned to a block yet. Reproduced once in CI on 12 Nov (see the last bullet of "What was observed"); not reproduced locally since: `flow_CDM_0001` passed 4 times and `iREC5Group` 3 times later on 12 Nov (three full UI runs and one single run, after the Step 5 fixes and with the page objects' reload recoveries removed, so a stuck overlay would now fail the test). (The note was first written as "the app re-initializes its workspace every few seconds"; that was wrong, see below.)
**Component:** `frontend` — `modules/policy-engine/policy-viewer/blocks/*` (each block has its own `div.loading`)
**Severity:** medium — `flow_CDM_0001` and `iREC5Group` fail when a click lands under the overlay or the overlay never goes
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/02_policies/flow_CDM_0001.cy.js`, `iREC5Group.cy.js`

## What the earlier "re-initialization" was

The bursts of `GET /accounts/session` every 5–7 s in the dev-server request trace (11 Nov) are the test's own navigations: each URL change runs the route guard and the header's update (`new-header.component.ts`, `update()` on `NavigationEnd`), which call `sessions()` three or four times, re-emit the login state (`AuthStateService.updateState`) and re-read the external-policy counters. The burst contents follow the flow (policy list, viewer, `blocks/<id>` of each wizard step, `search-documents`). Redundant requests, but not a loop and not the cause of the failures.

## What was observed

- 12 Nov, `flow_CDM_0001` (dev server, Solo 0.97.0, after the Step 5 fixes): at the "VVB documents" step the grid is loaded and a block below it shows its spinner; `div.loading` (three of them) stayed in the DOM for the whole 20 s budget (`Expected [ <div.loading>, 2 more... ] not to exist in the DOM`). The last requests of the page all answered 200: `tag/revoke_vvb_own_document_btn/blocks`, `document-owners`, `tokens`, `search-documents` (twice). Screenshot in `e2e-tests/.local/evidence/diag-cdm2-1/` (local, git-ignored).
- `iREC5Group`: a click on the "Issue Requests" tab covered by `div.loading`, in 2 of 3 runs on 11 Nov; 3 of 3 green on 12 Nov after the Step 5 fixes (task-result polling, bounded auth-service waits, the refresh that hands waiting requests their 401). A request stuck behind a refresh that never settled kept a block loading forever, which those fixes end; the 12 Nov CDM failure above happened with all requests answered, so it is a different path.
- The policy viewer threw `Cannot read properties of undefined (reading 'STANDARD_REGISTRY')` on every change detection before its profile arrived (fixed 12 Nov); it was not shown to cause the overlay.

- 12 Nov, CI run 43262698955 (branch `fixing-pending-issues` as published, `flow_CDM_0001` alone, 12 min): `createReport` failed on `cy.get('.preloader-image').should('not.exist')` after submitting the monitoring report (`Expected [ <div.preloader-image.preloader-image-l-size>, 3 more... ] not to exist in the DOM`, 10 s). The screenshot shows the project grid with a spinner under it. The service logs show the report chain complete (`new_report` steps 1, 2, 6, 7 and 8, `save_report` run at 17:26:08.4) about 9 s before the timeout, and a single `Block Unavailable` (503) for a block GET at 17:26:07.3. The CI run has no dev-server request trace, so the blocks that kept their placeholder are not known. The four `.preloader-image` elements are the placeholder `RenderBlockComponent` shows when it has no component yet (`render-block.component.html`), or a block's own loading markup.

## How to pin it

In a failing run, find which block component still has `loading === true` (the three `div.loading` of the CDM screenshot) and why: a load path without an error branch, an update push (`BlockUpdateFn`, 2000 ms batch) re-triggering the load, or a request the block waits on that the trace does not show. A run with the browser console (`ELECTRON_ENABLE_LOGGING=1`) and a DOM dump of the `div.loading` parents at the failure would settle it.
