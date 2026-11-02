# A half-finished onboarding leaves an orphan DID and re-runs the wizard on every boot

**Status:** open — the half-finished state is confirmed in the local workspace; the exact loss point is suspected, not yet pinned down
**Component:** `api-gateway/src/api/service/profile.ts` (`PUT /profiles/push/:username`) + `api-gateway/src/helpers/task-manager.ts` + `guardian-service/src/api/profile.service.ts` (`CREATE_USER_PROFILE_COMMON_ASYNC`) + `guardian-service/src/api/helpers/profile-helper.ts` (`setupUserProfile` → `createUserProfile` → `saveUserProfile`) + `frontend/src/app/views/user-profile/user-profile.component.ts`
**Severity:** medium — an onboarding attempt that dies between DID creation and the final user update leaves an orphan `did_document` + `USER_TOPIC` in `guardian_db`, and the affected user sees the setup wizard on every app boot
**Found by:** the 02_policies idempotency work (2 Nov 2026), while investigating why the suite's `User2` was never fully onboarded in this workspace after repeated `ensureAccount` attempts.

## Symptom

- A user whose onboarding attempt died part-way through the profile task has a complete `did_document` row (`status = CREATE`) and a `USER_TOPIC` owned by that DID in `guardian_db`, but the user document in `auth_db.user` has no `did`, `parent` or `hederaAccountId` — the final linking step never landed.
- In the affected workspace the pattern had accumulated over repeated probe runs: 8 such `did_document` rows (one per attempt) plus a `USER_TOPIC` for the last one; the affected user is a shell — it registers, it logs in, and the User Profile Setup wizard renders on every boot.
- `user-profile.component.ts` derives `confirmed` / `failed` at read time from `db.getDidDocument(user.did).status` (`CREATE` → confirmed, `FAILED` → failed). A user whose document carries no `did` is neither, so the wizard re-renders instead of the confirmed profile — forever, until the user is deleted or the link is written.

## Where it comes from (suspected)

The CONNECT_USER chain is: `PUT /profiles/push/:username` → `TaskManager.start` (an in-memory task with a 1-day TTL) + NATS `CREATE_USER_PROFILE_COMMON_ASYNC` → `guardian-service` `profile.service.ts` → `setupUserProfile` → `createUserProfile` (the DID document + `USER_TOPIC` — the step whose writes **are** in the database) → `saveUserProfile` → `users.updateCurrentUser`, a NATS `UPDATE_USER` to the auth service whose reply the gateway must receive for the task to complete.

The DB state — DID and topic written, user never linked, and **no** `GUARDIAN_SERVICE` entry at warning level or above for the task window in `logger_db` — is most consistent with that final `UPDATE_USER` reply being lost: `NatsService.sendMessage` (`common/src/mq/nats-service.ts`) has **no timeout** on the reply wait, so a lost reply leaves the promise pending instead of failing the task. That is the same failure class documented in [`gateway-auth-guard-hangs-when-the-auth-service-misses-the-reply.md`](gateway-auth-guard-hangs-when-the-auth-service-misses-the-reply.md) (there, a lost reply hangs an HTTP request behind a guard; here, inside an async task handler, it strands the task mid-chain after its writes).

Two things keep this at "suspected": the `ng-serve` `[proxy]` request trace for the affected run was cleaned from `/tmp` before it could be read, and `logger_db` only persists entries at level 30 or above, so an info-level failure in the task would not be visible from the database.

## Suggested fix

- Bound the reply wait on task-internal NATS calls (`sendMessageWithTimeout` already exists in `NatsService`) so a lost reply fails the task loudly instead of stranding it.
- Make the chain compensating or resumable: if the user update fails, the task should mark the DID `FAILED` (or roll back the orphan rows) rather than leaving a `CREATE`-status document that no user points at.
- Let the wizard resume instead of restarting: a user with an existing `CREATE`-status DID document that the user document does not point at should re-link the document, not generate a new DID from scratch.

## Test impact

- The 02 suite's `ensureAccount` treats "no `did` on the user" as "needs onboarding" and runs the wizard; for a user stuck in this half-finished state every run generates a *new* DID, so the workspace keeps accumulating orphan rows and a clean double-green of the suite is impossible in it until the workspace is cleaned or the stack issue is fixed.
