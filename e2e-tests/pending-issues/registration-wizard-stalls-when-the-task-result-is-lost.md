# Registration wizard and task pages: what is left after the task-result polling

**Status:** partly fixed on 12 Nov 2026. `AsyncProgressComponent` (the `/task/:id` page and the wizards' embedded progress) now reads the task again every 5 s until it settles, so a first read that lands while the gateway still hides the result (`callbackPending`), or a task-status push that is lost or goes to a socket bound to another user, no longer leaves the page waiting forever; a live instance given a new task id follows it (`ngOnChanges` keyed on `inputTaskId`). The test-side reload recovery of the task page (`waitForTaskRoundtripWithRecovery`) was removed; `editPolicy` and `exportPolicy` passed twice without it. Two things are left, below.
**Component:** `frontend` — `views/user-profile`, `views/root-profile`; `e2e-tests` — `configPage.generateHederaAccount`
**Severity:** medium — a first-ever registration in a fresh environment can still dead-end (`flow_CDM_0001` on a fresh database)

## Open: the onboarding round trip on a first-ever registration (11 Nov 2026)

The user setup wizard's final (onboarding) task, from the post-reboot `flow_CDM_0001` verification run C (11 Nov, fresh database, so the spec's `ensureAccount` registered `User2` and ran the full wizard — every pre-reboot run found the account already onboarded and bounced off, which is why this path had never been verified):

- The wizard's `Confirm` fired `PUT /profiles/push/User2` (202, 12:20:51.082Z) and the app fetched the onboarding task object 41 ms later (200 — a single `GET`, the in-progress body of the `callbackPending` window; no re-`GET`).
- The app never navigated to `/task/:id`: the proxy trace shows no task-route boot and the page re-initialized onto `/user-profile` three seconds later, where it stayed for the test's full 20 s `waitForTaskRoundtrip` budget (`importFlow.js`); the account was fully onboarded server-side — the next run's registration answered 409 and the profile view settled into the `ready` phase (DID and parent present), so the onboarding task completed without the client ever seeing it.
- As in the 10 Nov realization the delivery side cannot be fully attributed from client logs (WS frames are not logged): the app's single bootstrap socket was the unauthenticated 12:20:39 upgrade, the post-login access-token refresh rebinds it, and no upgrade or 401 followed — the completion reached no live, correctly-bound socket or was lost in flight; either way the one-shot delivery was missed and no polling fallback exists to recover it.
- Test-side consequence: the CDM round trip is a known dead end on a first-ever registration in this environment; the verification runs that follow a failed first registration are unaffected, because the completed account makes the next run bounce off. No test-side recovery was added (a reload-redo would re-run the wizard against an account that is already finished — the shape-agnostic drivers would then just re-confirm it), so this stays open as a product gap.

### Reproduced again on 11 Nov 2026

`flow_CDM_0001` on a fresh database (Solo 0.97.0, all packages rebuilt) failed in `_runUserOnboarding` (`homePage.js:561`) with `expected '/user-profile' to include '/task'`; `User2` ended fully onboarded server-side (DID, parent, Hedera account set). The first realization to be reproduced on demand: a first-ever registration of a user in a fresh environment.

Not re-checked after the polling fix: it needs a fresh database (a first-ever registration of `User2`). If it still happens, the page re-initialization of `frontend-workspace-reinitializes-every-few-seconds.md` is the first suspect: the page left the wizard three seconds after the push, before any task page was shown.

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
