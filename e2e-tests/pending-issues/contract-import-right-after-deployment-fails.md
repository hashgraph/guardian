# Importing a contract right after its deployment fails

**Status:** open, cause not established (product or local network)
**Component:** `POST /contracts/import` (`api-gateway` → `guardian-service`), seen through the UI
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/04_contracts/contractImport.cy.js`

## What was observed

On 5 Nov 2026, on the local Solo stack, the spec creates a wipe and a retire contract as `StandardRegistry` in its `before` hook, then imports them as `Verra` (the second registry) a few seconds later. The import answered **500**:

- first with `Hedera transaction failed: The contract id is invalid or does not exist` (UI error toast);
- with a retry of the import every couple of seconds for 20 s, every attempt answered `transaction 0.0.1020@… failed precheck with status INVALID_CONTRACT_ID against node account id 0.0.3`.

The same two contracts (`0.0.2486`, `0.0.2498`), imported as `Verra` through the API one to three minutes after their creation, were accepted (`POST /contracts/import` answered with the contract record).

Before the waits in the suites were bounded (`support/CustomHelpers/timeouts.js`), the spec spent long enough in fixed pauses that the import landed after this window, and it passed.

## How to reproduce

From `e2e-tests`, with the stack and the frontend running as described in the README:

```
npx cypress run --e2e --spec cypress/e2e/ui-tests/specs/04_contracts/contractImport.cy.js --config baseUrl=http://127.0.0.1:4200 --env apiServer=http://127.0.0.1:3002,hederaNet=localnode,minPasswordLength=4,passwordComplexity=easy
```

## To find out

- How long after the deployment the import starts to be accepted, and whether that delay depends on the mirror node (indexing) or on the consensus node (`INVALID_CONTRACT_ID` comes from the node precheck).
- Whether a client is expected to retry (then the spec should retry the import within a bounded time, closing the error toast first: in PrimeNG 21 its close button is `button.p-toast-close-button`), or whether the import should succeed as soon as the deployment returns (then it is a product issue).

## Test impact

`contractImport.cy.js` fails on the first import.
