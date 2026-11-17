# `013_contracts/003` fails when the mirror node answers 502 once (flaky)

**Status:** open, flaky test (seen once on 14 Nov 2026 on a local Solo stack; the previous run of the folder on the same stack was 149/149)
**Component:** `e2e-tests/cypress/e2e/api-tests/013_contracts`, `worker-service` (`get-contract-info` task)
**Severity:** low — one transient mirror error fails `003` and, through it, `004` and `005` (3 of 14 specs, 42 tests skipped)
**Found by:** running `000_accounts_creating`, `013_contracts` and `025_policy_labels` in order on an empty database

## What was observed

`003_importContract.cy.js` › `Import wipe smart-contract` got `500 {"statusCode":500,"message":"Request failed with status code 502"}` from `POST /contracts/import/` for contract `0.0.3461`. `004_setGetRemoveRetirePermissions` and `005_removeContracts` then failed in their `before all` hooks: `WIPE contract 0.0.3461 in the listing: expected undefined not to be undefined` and `WIPE contract "FirstAPIContractW" in the listing: expected undefined not to be undefined`.

The service logs show where the 502 came from:

- `worker-service-1.log`, 01:01:57.133Z: `Task started: …, get-contract-info`; 16 ms later `Task error: …, Request failed with status code 502`. It was the only task error in the logs of the five workers.
- The task reads `${HEDERA_CONTRACT_API}/<contractId>` from the mirror node REST API (`worker-service/src/api/helpers/hedera-sdk-helper.ts`), here `http://127.0.0.1:38081/api/v1/contracts/0.0.3461`, and does not retry: the 502 reaches the gateway as a 500.
- The contract had been created 8 s earlier (`created_timestamp` 01:01:49). Queried again afterwards, the same mirror URL answered 200 three times in a row with the contract data.

Not verified: what answered 502 so fast. It may be the port-forward or ingress in front of Solo's mirror REST pod; its logs are on the host, not reachable from the dev container.

## How to reproduce

It cannot be triggered on demand. Run `013_contracts` on a local Solo stack and watch for `Request failed with status code 502` on `POST /contracts/import/`.

## Test impact

`003`, `004` and `005` fail together on a single transient mirror error. Possible fixes, not decided: retry the mirror request on a 5xx in the worker (a product change), or retry the import in `003`.
