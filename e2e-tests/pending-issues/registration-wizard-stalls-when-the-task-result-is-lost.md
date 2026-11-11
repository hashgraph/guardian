# Registration wizard stalls forever when the task result is lost

**Status:** open — latent product bug; three known realizations (31 Oct 2026 SR wizard, 10 Nov 2026 CDM publish — the latter in "New evidence: CDM publish task" below, 11 Nov 2026 onboarding round trip — in "New evidence: onboarding round trip" below). The 9–10 Nov 2026 four UI spec failures that the "New evidence" section documented were re-attributed on 10 Nov 2026 to a different, fully pinned issue (an active USER system schema left by the 011 API spec appended a fifth step to the USER wizard — test-state coupling, fixed in the UI page objects; see `../work-in-progress/plan-fix-4-ui-spec-failures.md`). The mechanisms below remain open and are not exercised by that (now fixed) failure: in both Nov runs the wizard was alive — the Generate result landed via the HTTP task GET and the steps advanced.
**Component:** `frontend` — `modules/common/async-progress/async-progress.component.ts`, `views/root-profile/root-profile.component.ts`; `api-gateway` — `helpers/task-manager.ts`, `api/service/websockets.ts`
**Severity:** medium — onboarding dead-ends with no in-app recovery; only a page reload works, and every retry funds a new orphaned Hedera account. Re-graded from medium-high on 10 Nov 2026 after the 31 Oct evidence aged without reproduction, then re-confirmed open the same day by the CDM publish realization below (a task that completed server-side was never delivered to a live socket; the same missing fallback now also strands `/task/:id` route pages, not only the wizard).
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/00_account_registration/createAccount_Generate.cy.js` — runs of 31 Oct 2026 (14:22, 15:5x, 17:56; the 17:56 run, account `TestSRUI675890527`, supplied the most complete evidence below)
**Re-attribute (10 Nov 2026):** the "Reproduced by" line and the "New evidence" section of 9–10 Nov are superseded — those four spec failures were the schema coupling above, not this bug.

## Symptom

The worker completes the "Create random key" task in <1 s and the result exists server-side (verified for tasks `81f1047f…` / `45271a94…` via `GET /tasks/:id`: `result: { id: "0.0.1294/0.0.1295", key: … }`). Yet the SR wizard (`/config`, step 1) never fills `#operatorId`/`#operatorKey` and cannot advance. Three end states were observed, all unrecoverable without a page reload:

1. **Silent idle reset** — the wizard returns to its initial HEDERA step: empty inputs, Generate re-enabled. The push `202` may be the cause (the 14:22 run: lost in flight, `randomKey()`'s error callback resets with no toast) or the completion notification arrived (a green "Operation completed" toast rendered) but the wizard never applied it.
2. **Spinner freeze** — a full-screen `taskExecution` view with the step list; the wizard and its buttons are unmounted.
3. **Permanent preloader** — the centered `preloader-image` only (the 17:56 run's final frame): the wizard is unmounted and the small spinner never resolves. This is the `loading === true && taskId === undefined` template branch, i.e. `onAsyncCompleted()` ran, cleared `taskId`, then its follow-up `GET /tasks/:id` returned a body whose `result` was hidden (see mechanism 2) and the unconditional destructure threw (fixed: see mechanism 5).

In the 17:56 run the wizard went through variant 1, re-armed, was clicked again (a second funded account: `0.0.1294`, then `0.0.1295` — both orphaned), and then froze in variant 3. Every reload-and-retry funds yet another account.

## Re-attribution of the 9–10 Nov 2026 spec failures (10 Nov 2026)

The four failing specs of 9–10 Nov were **not** this bug. The full 276-spec run and the 4/4 rerun shared one root cause, pinned against the live stack on 10 Nov 2026:

- The API spec `011_schemas/putActiveSystemSchema.cy.js` (running before the UI suite in every `all` run) creates and **activates** a system schema with `entity: 'USER'` in the `StandardRegistry` workspace, and the product cannot deactivate or delete an active system schema (every gateway route answers `422 "Schema is active."`; `ACTIVE_SCHEMA` in guardian-service only sets flags).
- `user-profile.component.ts loadDate()` fetches `GET /schemas/system/entity/USER`, finds the active schema, and sets `vcDocumentType = true` — the wizard gains a fifth (VC document) step: the DID step renders **Next** instead of **Confirm** (`isFinish()` = `!didDocumentType && !vcDocumentType`), so the 00 specs' 10 s wait for a `Confirm` button that does not exist, and the 02 specs' Next click silently advances into the VC step whose unfilled form keeps the final Confirm a no-op — no push, no `/task` navigation, 20 s timeout. Live-verified: `GET /schemas/system/entity/USER` with a `StandardRegistry` session returned exactly the 011 spec's schema (uuid `0000b23a-b1ea-408f-a573…`, name `test`).
- In both runs the wizard was alive: the Generate result landed (the drivers assert `#operatorId` non-empty before moving on) via the HTTP task GET; nothing was lost. Exactly four specs in the UI tree drive this wizard and exactly those four failed.

The fix landed 10 Nov 2026 in the UI page objects (`homePage.js _runUserOnboarding`, `configPage.js runWizard` now drive the tail shape-agnostically, filling the appended VC form generically) and a one-off deactivation of the schema row; the 011 spec is untouched. Plan: `../work-in-progress/plan-fix-4-ui-spec-failures.md`.

The request-level trace of that rerun remains as context for this bug, not as its evidence: the whole run carries exactly one WebSocket upgrade (the unauthenticated bootstrap one) and the app never re-upgrades — consistent with mechanism 3 below — but the completions still arrived over the one-shot `taskService.get()` in `onAsyncCompleted()`, so the wizard advanced to the step where the schema coupling stopped it. The gateway log's burst of four `Unauthorized request` lines within 30 ms during the 00 specs' registration step is likewise an open observation, not a pinned cause. The `ws` 8.22.1 dependency bump that landed in the same pull is not a candidate trigger for anything: it only fixes IPC-URL path handling.

## New evidence: CDM publish task (10 Nov 2026)

A second realization, on the `/task/:id` route page rather than the wizard: task `9adc9095-bb51-4940-93e3-04adc18e289c` (`PUBLISH_POLICY`, policy `6af367df6372f917f87c20a2`, owner `6af25115a7830a9ec2b5f3da` = the StandardRegistry account the spec is logged in as), from the `flow_CDM_0001` run of 10 Nov 2026 (18:45–18:55Z):

- The app's single task `GET` landed 188 ms after the task's creation timestamp (18:52:52.804Z vs `date` 18:52:52.616Z) and returned an in-progress body (200). There is no re-GET: `AsyncProgressComponent.update()` runs exactly once in `ngOnInit`, and completion then depends entirely on the `UPDATE_TASK_STATUS` push.
- The WebSocket was live for the whole window: the proxy log shows no upgrade after 18:52:38 until the after-run snapshot, no 401s, no unanswered HTTP. Five access-token refreshes fired at the usual ~30 s cadence (18:53:07, :37, 18:54:06, :44, 18:55:27), all 200 — each one sent `SET_ACCESS_TOKEN` over the live socket, and the gateway's handler rebinds `ws.user` with `getUserByToken` (`websockets.ts:500`). Re-checked on 11 Nov 2026: a rejected token makes that call throw before the assignment, so `ws.user` keeps its previous value; the earlier claim that the rebind resolves `null` and deafens the socket was wrong. Why the push did not reach the page is therefore not pinned: a loss in transit or a rebind window cannot be ruled out from client-side logs, since WS frames are not logged.
- The app stayed on `/task/9adc9095…` past the 120 s round-trip budget (the test failed there), while the task completed server-side: a follow-up `GET /tasks/9adc9095…` (10 Nov, after the run) returned `callbackPending: false`, `info.completed: true` and a full `result` (`isValid: true`), and the policy's status is `PUBLISH`.

Two consequences. First, the missing polling fallback in this note's "Suggested fixes" applies to the `/task/:id` route page as well as the embedded wizard mode: both complete on one `GET` plus one non-replayed, user-gated push, and neither recovers a lost delivery. Second, a reload is a working test-side lever — a fresh boot re-issues the `GET`, which returns the result once `callbackPending` clears — so the UI page objects now budget the publish/dry-run round trip on that basis (`pageReadiness.waitForTaskRoundtripWithRecovery`, landed 10 Nov 2026 with the CDM fix): 120 s budgets, two reload-redo attempts, then a loud failure naming the task id. The product gap itself stays open.

## New evidence: onboarding round trip (11 Nov 2026)

A third realization, the user setup wizard's final (onboarding) task, from the post-reboot `flow_CDM_0001` verification run C (11 Nov, fresh database, so the spec's `ensureAccount` registered `User2` and ran the full wizard — every pre-reboot run found the account already onboarded and bounced off, which is why this path had never been verified):

- The wizard's `Confirm` fired `PUT /profiles/push/User2` (202, 12:20:51.082Z) and the app fetched the onboarding task object 41 ms later (200 — a single `GET`, the in-progress body of the `callbackPending` window; no re-`GET` — mechanism 2).
- The app never navigated to `/task/:id`: the proxy trace shows no task-route boot and the page re-initialized onto `/user-profile` three seconds later, where it stayed for the test's full 20 s `waitForTaskRoundtrip` budget (`importFlow.js`); the account was fully onboarded server-side — the next run's registration answered 409 and the profile view settled into the `ready` phase (DID and parent present), so the onboarding task completed without the client ever seeing it.
- As in the 10 Nov realization the delivery side cannot be fully attributed from client logs (WS frames are not logged): the app's single bootstrap socket was the unauthenticated 12:20:39 upgrade, the post-login access-token refresh rebinds it, and no upgrade or 401 followed — the completion reached no live, correctly-bound socket (mechanism 3) or was lost in flight; either way the one-shot delivery was missed and no polling fallback exists to recover it.
- Test-side consequence: the CDM round trip is a known dead end on a first-ever registration in this environment; the verification runs that follow a failed first registration are unaffected, because the completed account makes the next run bounce off. No test-side recovery was added (a reload-redo would re-run the wizard against an account that is already finished — the shape-agnostic drivers would then just re-confirm it), so this stays open as a product gap.

### Reproduced again on 11 Nov 2026

`flow_CDM_0001` on a fresh database (Solo 0.97.0, all packages rebuilt) failed in `_runUserOnboarding` (`homePage.js:561`) with `expected '/user-profile' to include '/task'`; `User2` ended fully onboarded server-side (DID, parent, Hedera account set). The first realization to be reproduced on demand: a first-ever registration of a user in a fresh environment.

## Why the wizard cannot recover

1. **Silent push failure.** `root-profile.randomKey()`'s error callback only sets `loading = false; taskId = undefined;` — no toast, no message.
2. **A window where the result is invisible on both channels.** `task-manager.addResult` runs the registered completion callback with `callbackPending = true` (`task-manager.ts` L284-290); `getState` **hides `result`/`error` from every client, including the owner, while that flag is set** (L351-360), and the WS `UPDATE_TASK_STATUS` is only sent *after* the callback finishes (`cleanupAfterCallback` L263-266). The client has exactly one `taskService.get()` on async-progress init and one user-gated WS message: a `get()` landing in the `callbackPending` window sees an empty body, and the one-shot WS message (plain `Subject`, no replay — `web-socket.service.ts`) can still be missed, leaving neither channel with the result.
3. **User-gated delivery.** The gateway sends `UPDATE_TASK_STATUS` only to sockets whose bound user matches the task owner (`websockets.ts` `notifyTaskProgress`, match `client.user?.id === task.userId`). A socket that reconnected with a stale or rejected access token (`ws.user` is set only by `SET_ACCESS_TOKEN`/`UPDATE_PROFILE`) delivers the completion to no one.
4. **Stale taskId gate + dead reset.** `async-progress.setTask()` drops any task whose id differs from the private `this.taskId` (L118-125), which is set only in `ngOnInit` (L73-77). The `ngOnChanges` reset branch (L89-96) is dead code: it tests `changes.taskId`, but Angular keys the changes object by the property name `inputTaskId` (the `@Input('taskId')` alias is not the key), so a live instance that receives a new taskId never re-syncs the gate nor resets `resultHandled`.
5. **Unconditional destructure — fixed.** `root-profile.onAsyncCompleted()` (`root-profile.component.ts:519-523`) now checks `task?.result`, shows a toast and clears `loading` before it destructures, so a `GET /tasks/:id` body with a hidden or missing result no longer parks the wizard on the permanent preloader (variant 3). Retrying the `get()` is still open.

## Suggested fixes (for the product side)

- Surface a push failure: toast in `randomKey()`'s error callback instead of a silent reset.
- Guard `onAsyncCompleted()`: done (toast and `loading` reset); retrying the `get()` once is still open.
- Give `inputTaskId` mode a polling fallback: if the one-shot `get()` finds no result, retry `taskService.get(taskId)` on an interval until it settles (`GET /tasks/:taskId` exists and returns the result once `callbackPending` clears).
- Make `taskStatusSubject` replay the last state per task on subscribe so a late subscriber cannot miss the final delivery.
- In `async-progress.ngOnChanges`, key on the actual property name (`inputTaskId`) and re-sync `this.taskId = this.inputTaskId` before the `setTask` gating.

## Test impact

The 00 suite's `generateHederaAccount(reHedera)` works around it as a ticket budget: every Generate click is one ticket on an independent delivery lottery (the worker completes the task regardless; only the client-side delivery varies), and the helper polls every 2 s for `#operatorId` to be filled. Outcomes per ticket:

- **Filled** → the wizard advanced, the helper returns and the spec continues.
- **Button re-armed** (variant 1) → the ticket was lost client-side; the next ticket is paced 15 s out.
- **Button absent (or stuck disabled) for 15 s** (variants 2/3) → the wizard is frozen; the page is reloaded (a reload rebinds the WebSocket, which is the only lever on the stale-socket delivery path) and `reHedera()` brings the page back to a ready HEDERA step — for the SR wizard that is where it re-opens anyway, for the user wizard it is SR card → Next → HEDERA step. The loop then continues against the same budget.

The budget is 9 tickets total (8 reload recoveries); exhausting it fails the test loudly on purpose rather than hang it. On the localnode dev setup a lost ticket costs nothing (demo keys cost no HBAR); on a paid network every spent ticket that still completed server-side funds an orphaned account, so a persistently broken WS/worker environment costs money before it fails.
