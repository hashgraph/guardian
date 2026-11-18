# Hedera and mirror node helpers live in worker-service instead of `@guardian/hedera`

**Status:** open, refactoring proposal (18 Nov 2026), not started
**Component:** `hedera` (`@guardian/hedera`), `worker-service`, `topic-listener-service`, `guardian-service`
**Severity:** low — no defect today; the cost is duplicated client code and fixes that reach only one caller
**Found by:** the mirror-node indexing fix of the Cypress 16 branch (`fix(worker): wait a few seconds for the mirror node…`, then `refactor(worker): one configurable wait…`)

## What was observed

`@guardian/hedera` is the package meant for Hedera code, but the code that talks to Hedera and to the mirror node REST API lives in `worker-service/src/api/helpers/`:

- `hedera-sdk-helper.ts` (about 2650 lines): `HederaSDKHelper`, every SDK transaction (tokens, topics, accounts, contracts) and every mirror node read (accounts, tokens, balances, topic messages, paginated collections), including the wait for the mirror node to ingest what was created moments ago (`readIndexed`, `MIRROR_NODE_INDEXING_TIMEOUT`, `MIRROR_NODE_INDEXING_POLL_INTERVAL`).
- `utils.ts`: `axiosGetWithRetry` (retry of 429, 5xx and network errors, `REST_API_RETRY_COUNT`, `REST_API_RETRY_DELAY`), `delay`, the `timeout` decorator, `HederaUtils`.
- `transaction-logger.ts`: a `TransactionLogger` with static helpers, next to the `TransactionLogger` (a NATS service) that `@guardian/hedera` already exports under the same name.
- `fireblocks-helper.ts`.

`@guardian/hedera` itself never calls the mirror node REST API: `MessageServer`, `TopicHelper` and the others send a task to the worker (`new Workers().addNonRetryableTask({ type: WorkerTaskType.GET_TOPIC_MESSAGE_BY_INDEX, … })`), and the worker runs the request. From the package the worker imports only `MockService`/`MockHelper` (`@guardian/hedera/mock-service`) and `HederaClientFactory` (`@guardian/hedera/client`). The package already depends on `@hiero-ledger/sdk` and `axios` (the latter for `vcjs/vcjs.ts`).

Two more services call the mirror node REST API with their own client code:

- `topic-listener-service/src/api/listener.ts` (`getMessages`): `axios.get` on `HEDERA_TOPIC_API/<topic>/messages`, with its own timeout, and its own backoff on errors in the polling loop (`Retry-After` on 429, its own parser of the header, like the worker's `getRetryAfterMs`).
- `guardian-service/src/api/contract.service.ts` (`resolveAccountFromEvmAddress`, `resolveEVMAddressFromAccount`): `fetch` on `HEDERA_ACCOUNT_API/<id>`, failing on the first non-2xx answer, with no retry and no indexing wait.

## Why it matters

- A mirror node fix has to be made in each copy. The indexing wait added on the Cypress 16 branch covers the worker only: `contract.service.ts` still fails at once on an account the mirror node has not ingested yet, or on a 429/5xx. The `Retry-After` parsing exists twice (worker `utils.ts`, listener).
- The worker's helpers cannot be unit-tested or reused from the package that owns the Hedera concepts, and two classes named `TransactionLogger` with different roles are confusing.

## Proposal

1. Move the mirror node REST client into `@guardian/hedera` (for example `hedera/src/mirror-node/`): `axiosGetWithRetry`, the indexing wait (`readIndexed`, `bodyUnlessNotFound`, the two environment variables), the paginated read, and the typed reads (account, token, balance, topic message by timestamp and by index, topic messages). Move their tests from `worker-service/tests/mirror-node-*.test.mjs` with them.
2. Make `worker-service`, `topic-listener-service` (`listener.ts`) and `guardian-service` (`contract.service.ts`) use it. `topic-listener-service` needs a dependency on `@guardian/hedera` (it has none today).
3. Then move the rest of `HederaSDKHelper` (SDK transactions), `HederaUtils`, the `timeout` decorator and the worker's `TransactionLogger` helpers into the package, merging or renaming the two `TransactionLogger` classes. This step is larger and can be a separate change.

Keep behaviour identical in each step: same environment variables (document them in the env templates of every service that then reads them), same error messages where callers or e2e specs match them (`MESSAGE_NOT_FOUND` in `007_modules/11_importModuleIPFS` comes from `MessageServer`, not from the worker).

## How to check

- Unit tests of `hedera`, `worker-service`, `topic-listener-service` and `guardian-service` (`npx mocha … --exit` after `npx tsc -p .`, see AGENTS.md), and `npm run lint` in each.
- `npm run guardian:build`, then the e2e folders that exercise the moved code: `000_accounts_creating`, `007_modules`, `013_contracts`, `016_policies_tests_and_flows`, and a policy flow (`policy-tests/irec`).

Delete this note once the helpers are in `@guardian/hedera`.
