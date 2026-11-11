# `POST /contracts/retire/{id}/pools` fails on a token the mirror node has not indexed yet

**Status:** open — the symptom no longer reproduces on Solo 0.97.0, the ordering that makes it harmful is still in the code
**Component:** `guardian-service` — `SET_RETIRE_POOLS` in `src/api/contract.service.ts`
**Severity:** medium — the call reports failure after it has already changed the contract on-chain
**Found by:** `e2e-tests/cypress/e2e/api-tests/013_contracts/006_setPools.cy.js`

## Summary

Setting a pool on a token created a few seconds earlier answers **500**, with
`Request failed with status code 404` from the Hedera mirror node behind it. Retrying the same call
a few seconds later succeeds.

## Why it is worse than a slow endpoint

The handler performs the contract call *first* and persists the pool afterwards:

```ts
await setPoolContract(workers, contractId, root.hederaAccountId, rootKey, options.tokens, options.immediately, userId);

return new MessageResponse(
    await setPool(workers, dataBaseServer, contractId, options, userId)   // reads the token back
);                                                                        // from the mirror node
```

`setPool` resolves each token through `GET_TOKEN_INFO`, which is a mirror node read. The mirror node
needs a few seconds to index a token that has just been created, so it answers 404 and the endpoint
reports 500 — **after `Retire.setPool` has already run on-chain**. The caller sees a failure for a
call that partly succeeded: the pool is set on the contract and the wipe request is raised, but
Guardian holds no record of the pool.

Observed on a local quickstart, consistently, when a pool is set within ~5 seconds of the token's
`TokenCreateTransaction`; three different tokens, three 500s, and all three wipe requests were
raised on-chain regardless.

## What the tests do meanwhile

`Contracts.setRetirePool` (`e2e-tests/cypress/support/api/contracts.js`) repeats the call until it
is accepted. That is safe — a second `requestWiper` for a token that already has a request
outstanding reverts inside the retire contract's own `try/catch` — but it costs a contract call's
worth of gas per attempt, so the retry interval is deliberately long.

Re-checked on 6 Nov 2026: the handler still calls the contract before `setPool`; `013_contracts/006_setPools.cy.js` passes (5/5) thanks to the retry in `Contracts.setRetirePool`.

Re-checked on 11 Nov 2026 on Solo 0.97.0: a probe that mirrors `006_setPools` (a fresh wipe-bound token, the pool set immediately) was accepted on the first attempt, twice, in about 2 s, and `013_contracts` is green (14 specs, 149 tests). The symptom was not reproduced, probably because of the Solo upgrade. The ordering that made it harmful is still in the code: the handler calls `setPoolContract` (`contract.service.ts:3274`) before the mirror-node read in `setPool` (`:3285`), so a lagging mirror node would still produce the partial success.

On 11 Nov 2026 the retry in `Contracts.setRetirePool` was removed for a trial run of `013_contracts`: the pool call was accepted at once in two of three runs and timed out after 20 s in one. The folder fails for an unrelated reason on a used workspace (`mirror-node-pagination-drops-the-port.md`), so the trial could not be completed and the retry is back in place. Repeat it once that note is fixed.

## Proposed fix

Either wait for the token to be resolvable before touching the contract, or persist the pool from
what is already known about the token rather than re-reading it from the mirror node. Failing that,
the endpoint should not report a plain 500 for a call whose on-chain half has succeeded.
