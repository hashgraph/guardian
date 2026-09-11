# `POST /contracts/retire/{id}/pools` fails on a token the mirror node has not indexed yet

**Status:** open
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

## Proposed fix

Either wait for the token to be resolvable before touching the contract, or persist the pool from
what is already known about the token rather than re-reading it from the mirror node. Failing that,
the endpoint should not report a plain 500 for a call whose on-chain half has succeeded.
