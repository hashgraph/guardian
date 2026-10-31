# The gateway's auth guard hangs an HTTP request forever when the auth service never replies, freezing the UI

**Status:** open — infra robustness bug; seen once (transient), but the failure mode is a permanent UI freeze with no error and no way out
**Component:** `common/src/mq/nats-service.ts` (`sendMessage`) + `api-gateway/src/auth/auth-guard.ts` + `api-gateway/src/helpers/users.ts` (`Users.getUserByToken`); the frozen UI is `frontend/src/app/views/user-profile/user-profile.component.ts` (`createDID`)
**Severity:** medium — one transient hit in ~40 wizard runs, but the consequence is a full-screen spinner that never resolves; the affected user can only reload
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/00_account_registration/` run of 31 Oct 2026: after the USER wizard's `Confirm` click, the app fired
`PUT /api/v1/profiles/push/:user` and the page froze on a spinner. The attached `[proxy]` request logger
(`frontend/proxy.hostdocker.js`) shows the request went out and no `<-` status line ever came back. An identical
`PUT /profiles/push` repro via `curl` 30 minutes later answered `202 in 24ms`, so the miss was transient, not an outage.

## Symptom

- The user finishes the registration wizard and clicks **Confirm**.
- The app shows a full-screen loading spinner and never shows anything again: no 202, no error toast, no navigation.
- In the ng-serve proxy log the request is a one-way trip: `-> PUT /api/v1/profiles/push/:user` with no matching
  `<- <status>` line, ever. The gateway accepted the request and then holds it.

## Where it comes from

1. **Frontend:** `createDID()` (`user-profile.component.ts`) sets `loading = true` and
   `headerProps.setLoading(true)` (the full-screen spinner), then calls `profileService.pushSetProfile(profile)` —
   a plain `http.put(...)` with **no HttpClient timeout**, and the error callback only fires for responses that
   actually arrive. A request that never answers produces no error and no spinner relief.
2. **Gateway:** `PUT /profiles/push/:username` (`api-gateway/src/api/service/profile.ts`) is decorated
   `@Auth(Permissions.PROFILES_USER_UPDATE)`, which stacks `AuthGuard` in front of the handler. `AuthGuard.canActivate`
   does `request.user = await this.users.getUserByToken(token)` — **before** the handler can run, and its `catch`
   maps a *rejected* lookup to 401.
3. **The unbounded wait:** `Users.getUserByToken` (`api-gateway/src/helpers/users.ts`) is
   `NatsService.sendMessage(AuthEvents.GET_USER_BY_TOKEN, { token })`. `sendMessage`
   (`common/src/mq/nats-service.ts`) resolves its promise only when the auth service publishes a reply on the
   gateway's `replySubject` inbox — there is **no timeout** on that wait. If the reply never arrives (auth service
   busy or restarting, NATS reply lost, reply routed to a dead or stale inbox), the promise stays pending forever,
   the guard's `await` never returns, and the `catch` cannot help because nothing rejects.

So a single dropped reply from the auth service turns one HTTP request into a request that is open until the
browser gives up, and the wizard UI — which blocks on exactly that request — into a dead end. The whole `Users`
helper (dozens of NATS lookups behind guards and handlers: `currentUser`, `permission`, `registerNewUser`,
`generateNewAccessToken`, …) is exposed to the same mode; any authenticated route can hang the same way.

`NatsService` already ships the fix as a primitive — `sendMessageWithTimeout(subject, timeout, data)` (a
`Promise.race` that rejects with `REQUEST_TIMEOUT` and cleans up the callback) — it is just not used on this path.

## Suggested fix

- Use `sendMessageWithTimeout` (a few seconds) for the token/user lookups behind `AuthGuard` at minimum; the
  guard already maps *any* throw to `401 Unauthorized`, so a timeout maps cleanly to the one behaviour the
  frontend's auth interceptor is already built to handle (refresh + retry).
- Better: bound the wait centrally — a `Promise.race` in `canActivate`, or a Nest interceptor/HTTP deadline — so
  no guard or handler can hold a request open indefinitely.
- Frontend hardening (independent and cheap): add `{ timeout: 30_000 }` to the wizard's `pushSetProfile`
  (and `restoreProfile`) calls so a hung push at least ends in an error toast and a released spinner instead of
  a silent freeze.

Note: this is a **different** bug from `registration-wizard-stalls-when-the-task-result-is-lost.md` (there the 202
*was* delivered and the task result was lost client-side). Here the 202 is never sent at all — the request dies
inside the auth guard.

## Test impact

- The 00 suite now survives both stall modes: `generateHederaAccount()` covers the Generate race, and
  `waitForTaskNavigationOrRecover(runWizard)` covers this one — after the `Confirm` click it polls for the
  `/task/...` navigation for 60s; on timeout it reloads, waits for the app to settle, redoes the wizard tail once,
  and fails loudly if it still does not navigate.
- The SR Connect flow (`hederaSRRegistration` → same `push` call) has the same exposure. It has passed three
  consecutive full runs, so it does not get the reload-redo recovery in the tests — its exposure is covered by
  this entry as product-side work.
- Diagnostic tooling: the `[proxy]` request logger in `frontend/proxy.hostdocker.js` is how the hang was spotted
  (a `->` line with no `<-` line). Any future e2e failure that shows a fired request with no response is
  most likely this mode, whatever the route.
