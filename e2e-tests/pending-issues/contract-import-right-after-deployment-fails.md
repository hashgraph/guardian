# Importing a contract right after its deployment fails

**Status:** open, cause not established (product or local network); not reproduced on Solo 0.97.0 (11 Nov 2026). The spec works around it with a bounded retry; the workaround is to be removed once a contract can be imported within seconds of its deployment.
**Component:** `POST /contracts/import` (`api-gateway` → `guardian-service`), seen through the UI
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/04_contracts/contractImport.cy.js`

## What was observed

On 5 Nov 2026, on the local Solo stack, the spec creates a wipe and a retire contract as `StandardRegistry` in its `before` hook, then imports them as `Verra` (the second registry) a few seconds later. The import answered **500**:

- first with `Hedera transaction failed: The contract id is invalid or does not exist` (UI error toast);
- with a retry of the import every couple of seconds for 20 s, every attempt answered `transaction 0.0.1020@… failed precheck with status INVALID_CONTRACT_ID against node account id 0.0.3`.

The same two contracts (`0.0.2486`, `0.0.2498`), imported as `Verra` through the API one to three minutes after their creation, were accepted (`POST /contracts/import` answered with the contract record).

Re-checked on 6 Nov 2026 on a fresh stack: without a retry the spec fails (`tr.card-row` never appears), and the worker log shows `INVALID_CONTRACT_ID` for the import made 15 s after the deployment. Importing the same WIPE and RETIRE contracts (`0.0.1293`, `0.0.1303`) as `Verra` through the API about 100 s after their creation answered 200 for both. With the retry described below, the whole spec takes about 35 s, so the contracts become importable well inside the 100 s budget; the exact delay was not measured.

Before the waits in the suites were bounded (`support/CustomHelpers/timeouts.js`), the spec spent long enough in fixed pauses that the import landed after this window, and it passed.

Re-checked on 11 Nov 2026 on Solo 0.97.0: three imports as `Verra`, made 0.8 s after the deployment, were each accepted on the first attempt, and the `contractImport` UI spec is green. The symptom no longer reproduces, probably because of the Solo upgrade (`5a4ed1fcc`). The retry in `ContractsPage.importContract` is still in place, so the spec alone does not prove it; removing it is the next step.

## How to reproduce

From `e2e-tests`, with the stack and the frontend running as described in the README:

```
npx cypress run --e2e --spec cypress/e2e/ui-tests/specs/04_contracts/contractImport.cy.js --config baseUrl=http://127.0.0.1:4200 --env apiServer=http://127.0.0.1:3002,hederaNet=localnode,minPasswordLength=4,passwordComplexity=easy
```

## To find out

- How long after the deployment the import starts to be accepted, and whether that delay depends on the mirror node (indexing) or on the consensus node (`INVALID_CONTRACT_ID` comes from the node precheck).
- Whether a client is expected to retry (then the spec should retry the import within a bounded time, closing the error toast first: in PrimeNG 21 its close button is `button.p-toast-close-button`), or whether the import should succeed as soon as the deployment returns (then it is a product issue).

## Test impact

`ContractsPage.importContract` (`pages/contractsPage.js`) repeats the import every 5 s for up to 100 s (`IMPORT_ACCEPTED_WITHIN`) while the error toast says `The contract id is invalid or does not exist`, and fails at once on any other error. Even 100 s is too long: a contract deployment takes a few seconds on the local network (the suites' own rule is that anything above 10 s means something is broken), and the same deployment is usable for transactions the moment it returns. Something between the deployment answer and the import precheck is not what it should be, so the retry hides a defect.

To close it: measure the delay (import the same contract at fixed intervals after deployment), then find out whether `INVALID_CONTRACT_ID` comes from a node that has not caught up, from the import reading a contract the deployment task did not finish creating, or from the id handed back by the deployment. Then drop the retry and its 100 s budget.
