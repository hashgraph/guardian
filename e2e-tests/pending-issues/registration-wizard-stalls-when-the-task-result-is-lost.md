# Registration wizard stalls forever when the task result is lost

**Status:** open — latent product bug; the 31 Oct 2026 SR-wizard observation below is the only known evidence (a genuine loss, not explainable by the 9–10 Nov issue). The 9–10 Nov 2026 four UI spec failures that the "New evidence" section documented were re-attributed on 10 Nov 2026 to a different, fully pinned issue (an active USER system schema left by the 011 API spec appended a fifth step to the USER wizard — test-state coupling, fixed in the UI page objects; see `plan-fix-4-ui-spec-failures.md`). The mechanisms below remain open and are not exercised by that (now fixed) failure: in both Nov runs the wizard was alive — the Generate result landed via the HTTP task GET and the steps advanced.
**Component:** `frontend` — `modules/common/async-progress/async-progress.component.ts`, `views/root-profile/root-profile.component.ts`; `api-gateway` — `helpers/task-manager.ts`, `api/service/websockets.ts`
**Severity:** medium — onboarding dead-ends with no in-app recovery; only a page reload works, and every retry funds a new orphaned Hedera account. Re-graded from medium-high on 10 Nov 2026: not reproduced in the 276-spec run of 9–10 Nov, no known repro conditions beyond the 31 Oct observation.
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/00_account_registration/createAccount_Generate.cy.js` — runs of 31 Oct 2026 (14:22, 15:5x, 17:56; the 17:56 run, account `TestSRUI675890527`, supplied the most complete evidence below)
**Re-attribute (10 Nov 2026):** the "Reproduced by" line and the "New evidence" section of 9–10 Nov are superseded — those four spec failures were the schema coupling above, not this bug.

## Symptom

The worker completes the "Create random key" task in <1 s and the result exists server-side (verified for tasks `81f1047f…` / `45271a94…` via `GET /tasks/:id`: `result: { id: "0.0.1294/0.0.1295", key: … }`). Yet the SR wizard (`/config`, step 1) never fills `#operatorId`/`#operatorKey` and cannot advance. Three end states were observed, all unrecoverable without a page reload:

1. **Silent idle reset** — the wizard returns to its initial HEDERA step: empty inputs, Generate re-enabled. The push `202` may be the cause (the 14:22 run: lost in flight, `randomKey()`'s error callback resets with no toast) or the completion notification arrived (a green "Operation completed" toast rendered) but the wizard never applied it.
2. **Spinner freeze** — a full-screen `taskExecution` view with the step list; the wizard and its buttons are unmounted.
3. **Permanent preloader** — the centered `preloader-image` only (the 17:56 run's final frame): the wizard is unmounted and the small spinner never resolves. This is the `loading === true && taskId === undefined` template branch, i.e. `onAsyncCompleted()` ran, cleared `taskId`, then its follow-up `GET /tasks/:id` returned a body whose `result` was hidden (see mechanism 2) and the unconditional destructure below threw.

In the 17:56 run the wizard went through variant 1, re-armed, was clicked again (a second funded account: `0.0.1294`, then `0.0.1295` — both orphaned), and then froze in variant 3. Every reload-and-retry funds yet another account.

## Re-attribution of the 9–10 Nov 2026 spec failures (10 Nov 2026)

The four failing specs of 9–10 Nov were **not** this bug. The full 276-spec run and the 4/4 rerun shared one root cause, pinned against the live stack on 10 Nov 2026:

- The API spec `011_schemas/putActiveSystemSchema.cy.js` (running before the UI suite in every `all` run) creates and **activates** a system schema with `entity: 'USER'` in the `StandardRegistry` workspace, and the product cannot deactivate or delete an active system schema (every gateway route answers `422 "Schema is active."`; `ACTIVE_SCHEMA` in guardian-service only sets flags).
- `user-profile.component.ts loadDate()` fetches `GET /schemas/system/entity/USER`, finds the active schema, and sets `vcDocumentType = true` — the wizard gains a fifth (VC document) step: the DID step renders **Next** instead of **Confirm** (`isFinish()` = `!didDocumentType && !vcDocumentType`), so the 00 specs' 10 s wait for a `Confirm` button that does not exist, and the 02 specs' Next click silently advances into the VC step whose unfilled form keeps the final Confirm a no-op — no push, no `/task` navigation, 20 s timeout. Live-verified: `GET /schemas/system/entity/USER` with a `StandardRegistry` session returned exactly the 011 spec's schema (uuid `0000b23a-b1ea-408f-a573…`, name `test`).
- In both runs the wizard was alive: the Generate result landed (the drivers assert `#operatorId` non-empty before moving on) via the HTTP task GET; nothing was lost. Exactly four specs in the UI tree drive this wizard and exactly those four failed.

The fix landed 10 Nov 2026 in the UI page objects (`homePage.js _runUserOnboarding`, `configPage.js runWizard` now drive the tail shape-agnostically, filling the appended VC form generically) and a one-off deactivation of the schema row; the 011 spec is untouched. Plan: `plan-fix-4-ui-spec-failures.md`.

The request-level trace of that rerun remains as context for this bug, not as its evidence: the whole run carries exactly one WebSocket upgrade (the unauthenticated bootstrap one) and the app never re-upgrades — consistent with mechanism 3 below — but the completions still arrived over the one-shot `taskService.get()` in `onAsyncCompleted()`, so the wizard advanced to the step where the schema coupling stopped it. The gateway log's burst of four `Unauthorized request` lines within 30 ms during the 00 specs' registration step is likewise an open observation, not a pinned cause. The `ws` 8.22.1 dependency bump that landed in the same pull is not a candidate trigger for anything: it only fixes IPC-URL path handling.

## Why the wizard cannot recover

1. **Silent push failure.** `root-profile.randomKey()`'s error callback only sets `loading = false; taskId = undefined;` — no toast, no message.
2. **A window where the result is invisible on both channels.** `task-manager.addResult` runs the registered completion callback with `callbackPending = true` (`task-manager.ts` L284-290); `getState` **hides `result`/`error` from every client, including the owner, while that flag is set** (L351-360), and the WS `UPDATE_TASK_STATUS` is only sent *after* the callback finishes (`cleanupAfterCallback` L263-266). The client has exactly one `taskService.get()` on async-progress init and one user-gated WS message: a `get()` landing in the `callbackPending` window sees an empty body, and the one-shot WS message (plain `Subject`, no replay — `web-socket.service.ts`) can still be missed, leaving neither channel with the result.
3. **User-gated delivery.** The gateway sends `UPDATE_TASK_STATUS` only to sockets whose bound user matches the task owner (`websockets.ts` `notifyTaskProgress`, match `client.user?.id === task.userId`). A socket that reconnected with a stale or rejected access token (`ws.user` is set only by `SET_ACCESS_TOKEN`/`UPDATE_PROFILE`) delivers the completion to no one.
4. **Stale taskId gate + dead reset.** `async-progress.setTask()` drops any task whose id differs from the private `this.taskId` (L118-125), which is set only in `ngOnInit` (L73-77). The `ngOnChanges` reset branch (L89-96) is dead code: it tests `changes.taskId`, but Angular keys the changes object by the property name `inputTaskId` (the `@Input('taskId')` alias is not the key), so a live instance that receives a new taskId never re-syncs the gate nor resets `resultHandled`.
5. **Unconditional destructure.** `root-profile.onAsyncCompleted()` does `const { id, key } = task.result` (L519) with no guard: a `GET /tasks/:id` body with a hidden or missing `result` throws inside the RxJS success handler, `loading` is never cleared, and the wizard parks on the permanent preloader (variant 3).

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
