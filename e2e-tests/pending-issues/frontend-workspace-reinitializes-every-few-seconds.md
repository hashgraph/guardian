# The app re-initializes its workspace every few seconds and the loading overlay starves UI clicks

**Status:** open — observed repeatedly, trigger not pinned down.
**Component:** `frontend` — app bootstrap (`app.component`, `AuthStateService`, `web-socket.service.ts`); possibly `api-gateway` WebSocket rebind
**Severity:** medium — wizard and page-object clicks land under a `div.loading` overlay and time out; `flow_CDM_0001` fails on it after about 14 minutes
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/02_policies/flow_CDM_0001.cy.js` (second run on 11 Nov 2026) and, earlier, runs I and J of the downstream handover

## What was observed

- 11 Nov 2026, Solo 0.97.0, fresh stack, `ng serve` with the request trace on (`UI_PROXY_LOG=true`): the onboarding of `User2` passed (the account was already complete), then the flow ran 14 minutes and failed on a wizard step click covered by the `div.loading` overlay (`wizardSteps.js:144`, logged in as `User2`), against a 10 s click budget.
- In the last 30 s before the failure the workspace re-initialized every 5–7 s: `GET /accounts/session` bursts at 18:07:40, :46, :53, :57, 18:08:02 and :08, each followed by the workspace fetch set. No 401, no WebSocket upgrade, one 503 on `tag/add_report_bnt/blocks`.
- The same shape was seen on 10 Nov in run I of the handover: a re-init loop of about 1 Hz in the final minute whose overlay starved the wizard step click for the full 10 s, and a ~11 s same-document re-init after every login 200 (a re-POST of `/accounts/login`, a WebSocket rebind, the branding, session, profile and balance fetches).

## Where it may come from (candidates, none verified)

- The WebSocket rebind after the access token is set (`web-socket.service.ts`). No 11 s timer exists in `frontend/src/app`, so the cadence is not a constant in the code.
- An `UPDATE_PERMISSIONS` push triggers a hard `location.reload()` (`web-socket.service.ts`, around L239): a document swap with no hook for a test.
- The dev server's HMR socket (`ng serve`); a run against a production build would exclude it.

## How to pin it

Run the flow with the request trace on and correlate each `GET /accounts/session` burst with the WebSocket frames (the proxy does not log frames: log them in the browser with a `console.debug` in `web-socket.service.ts` for one run) and with `location.reload` calls; repeat on a production build to rule out HMR.

## Test impact

`flow_CDM_0001` cannot be made reliable on a used workspace while the re-init cycle is shorter than the page objects' budgets: a click budget in seconds lands between two cycles. The page objects wait for the loading overlay to be gone (`pageReadiness.js`, `waitForPageSettled`), which helps only when the cycle is longer than the settle time.
