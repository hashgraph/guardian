# The demo key API drops the calling user: generated accounts get no user attribution

**Status:** open — data attribution gap; nothing fails, so it is invisible unless someone reads the transaction logs
**Component:** `guardian-service/src/api/demo.service.ts` (`demoAPI`, both handlers) — the dropped value is produced by `api-gateway/src/api/service/demo.ts` (`randomKey`, `pushRandomKey`) and `api-gateway/src/helpers/guardians.ts` (`generateDemoKey`, `generateDemoKeyAsync`)
**Severity:** medium — the wizard's "Generate" rides this exact path, so every key generated in the registration wizard logs its on-chain account creation with `userId: null`
**Found by:** reading `guardian-service/src/api/demo.service.ts` while making `e2e-tests/cypress/e2e/ui-tests/specs/00_account_registration/` resilient: both `demoAPI` handlers hardcode `generateDemoKey(role, notifier, null)` while the message contract already carries the user id.

## Where it comes from

1. **Gateway** `demo.ts`: `GET /demo/random-key` and `GET /demo/push/random-key` are `@Auth` routes; both pass the caller explicitly — `guardians.generateDemoKey(role, user.id.toString())` and `guardians.generateDemoKeyAsync(user?.role, task, user.id.toString())`.
2. **Gateway helper** `guardians.ts` forwards it: `sendMessage(MessageAPI.GENERATE_DEMO_KEY, { role, userId })` (and the async twin with `task`).
3. **Service** `demo.service.ts` destructures only `{ role }` / `{ role, task }` — the `userId` field is silently discarded — and calls `generateDemoKey(role, notifier, null)` with a hardcoded `null` in both handlers.
4. **Worker** (`worker-service/src/api/worker.ts`, `CREATE_ACCOUNT` case) receives `payload: { userId: null }` and hands it to `HederaSDKHelper.newAccount(initialBalance, userId)`, which threads it into the transaction log messages (`transactionStartLog` / `transactionEndLog` / `transactionErrorLog` → `TransactionLogger.getTransactionData` → `payload: { userId }`).

So the whole chain between the gateway and the worker is built to carry the user id; the one hop that drops it is a missing destructure.

## Impact

- The UI registration wizard's **Generate** button calls `pushGetRandomKey()` (`frontend/src/app/services/demo.service.ts` → `GET /demo/push/random-key`) — the async variant above. Every hedera account the wizard funds is therefore logged with no user, even though the wizard runs for a fully authenticated account and the gateway task it creates (`CREATE_RANDOM_KEY`) is user-scoped.
- The same hole applies to the synchronous `GET /demo/random-key` (covered by `api-tests/001_demo/getRandomKey.cy.js`).
- Consequence: per-user transaction history / attribution for these on-chain creations is empty. The demo keys are indistinguishable from unowned background activity in the logs.

## Suggested fix

- In `demo.service.ts`, destructure `userId` from the message in both handlers and pass it through instead of `null` (`async (msg: { role: string, userId: string }) => ... generateDemoKey(role, notifier, msg.userId)`); keep `null` only if the contract should allow unauthenticated callers, and document that.
- `generateDemoKey`'s parameter is already typed `userId: string`, so the hardcoded `null` is a type-level lie as well as a data hole.

## Test impact

- None of the suites can observe the gap today (a `null` payload does not fail anything), so no test change accompanies this entry.
- If the fix lands, `api-tests/001_demo/` is the natural place to assert the `userId` round-trip (e.g. the task or a log query reflects the caller).
