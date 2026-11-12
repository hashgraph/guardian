# Registration wizard and task pages: what is left after the task-result polling

**Status:** partly fixed on 12 Nov 2026. `AsyncProgressComponent` (the `/task/:id` page and the wizards' embedded progress) now reads the task again every 5 s until it settles, so a first read that lands while the gateway still hides the result (`callbackPending`), or a task-status push that is lost or goes to a socket bound to another user, no longer leaves the page waiting forever; a live instance given a new task id follows it (`ngOnChanges` keyed on `inputTaskId`). The test-side reload recovery of the task page (`waitForTaskRoundtripWithRecovery`) was removed; `editPolicy` and `exportPolicy` passed twice without it. What is left is below.
**Component:** `frontend` — `views/user-profile`, `views/root-profile`; `e2e-tests` — `configPage.generateHederaAccount`
**Severity:** medium — a user's task page that stops issuing requests fails the 00 suite intermittently

## To verify: the onboarding round trip on a first-ever registration

`flow_CDM_0001` on a fresh database failed in `_runUserOnboarding` (`homePage.js:561`) with `expected '/user-profile' to include '/task'` (11 Nov twice, 12 Nov once). The 12 Nov run had the dev-server request trace and a browser-side trace: the app did go to the task page (`GET /tasks/<id>` 20 ms after `PUT /profiles/push/User2`) and came back to `/user-profile` 2.5 s later, when the task completed. The test missed the round trip: `completeUserWizard` (`configPage.js`) kept polling for the optional VC step for up to 10 s after the page had left the wizard, so `waitForTaskRoundtrip` started looking for `/task` when it was already over. A fresh database has no active USER system schema, hence no VC step, and its tasks are fast. The 11 Nov reading ("the app never navigated to `/task`") was wrong: the single `GET` of the task object 41 ms after the push was the task page.

Fixed in the helper on 12 Nov: the poll stops once the page has left `/user-profile`, and its deadline is armed when it runs instead of when it is queued. Still to do: run `flow_CDM_0001` on a fresh database (a first-ever registration of `User2`) and delete this section if it passes.

## Open: a user's onboarding task page that does nothing (12 Nov 2026)

`createAccount_Generate.cy.js` "Create and registration user" failed twice in a row right after a restart of the services (`the location pathname is still /task/<id> after 20000 ms`), and passed in the five runs before and after. Both times the onboarding completed server-side (the user had its DID, the task `Connect user` answered `completed: true` with the DID as result afterwards), the page had issued one `GET /tasks/<id>` (in progress), and then the dev-server proxy logged no request at all for the rest of the wait: no read of the task every 5 s, which the page does now, and no document reload. In a passing run of the same step the document reloads about 1.5 s after the first read (a new WebSocket and a full bootstrap: the `UPDATE_PERMISSIONS` push that follows the user's role change calls `location.reload()`) and lands on the home page. A page that stops issuing any request looks like a blocked or replaced document rather than a missed result; not pinned down. To look into it: capture the browser console of a failing run (`ELECTRON_ENABLE_LOGGING=1`) and the screenshot.

## Open: the Generate ticket budget of the 00 suite

A failed `PUT /profiles/push` in `root-profile.randomKey()` is not silent: the HTTP error interceptor shows a toast for every error but a 401, which goes through the token refresh. What the polling fix does not cover is whether the three wizard end states the budget below was built for (silent reset, spinner freeze, permanent preloader) still happen. To retire it: run the 00 specs a number of times with a log of how many tickets each Generate takes, and drop the budget if it is always one.

## Test impact

The 00 suite's `generateHederaAccount(reHedera)` works around it as a ticket budget: every Generate click is one ticket on an independent delivery lottery (the worker completes the task regardless; only the client-side delivery varies), and the helper polls every 2 s for `#operatorId` to be filled. Outcomes per ticket:

- **Filled** → the wizard advanced, the helper returns and the spec continues.
- **Button re-armed** (variant 1) → the ticket was lost client-side; the next ticket is paced 15 s out.
- **Button absent (or stuck disabled) for 15 s** (variants 2/3) → the wizard is frozen; the page is reloaded (a reload rebinds the WebSocket, which is the only lever on the stale-socket delivery path) and `reHedera()` brings the page back to a ready HEDERA step — for the SR wizard that is where it re-opens anyway, for the user wizard it is SR card → Next → HEDERA step. The loop then continues against the same budget.

The budget is 9 tickets total (8 reload recoveries); exhausting it fails the test loudly on purpose rather than hang it. On the localnode dev setup a lost ticket costs nothing (demo keys cost no HBAR); on a paid network every spent ticket that still completed server-side funds an orphaned account, so a persistently broken WS/worker environment costs money before it fails.
