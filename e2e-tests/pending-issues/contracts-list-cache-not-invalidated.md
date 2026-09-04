# `GET /contracts` serves a stale list after create/delete

**Component:** `api-gateway`
**File:** `api-gateway/src/api/service/contract.ts`
**Severity:** medium — clients see contracts that no longer exist (or miss ones just created) for the whole cache TTL
**Found by:** `e2e-tests/cypress/e2e/api-tests/013_contracts/005_removeContracts.cy.js`

## Summary

The contract listing endpoint is cached, but the cache is never invalidated for the keys
that clients actually read. After deleting a contract, `GET /contracts?type=RETIRE` keeps
returning the deleted contract until the entry expires on its own.

## Root cause

Two separate gaps in `contract.ts`:

1. **`removeContract` does not invalidate anything.** The handler (line 383) calls
   `guardians.removeContract(...)` and returns, with no `cacheService.invalidate(...)`
   anywhere — unlike the create handlers, which at least attempt it.

   ```ts
   @Delete('/:contractId')
   async removeContract(
       @AuthUser() user: IAuthUser,
       @Param('contractId') contractId: string,
   ): Promise<boolean> {
       try {
           const owner = new EntityOwner(user);
           const guardians = new Guardians();
           return await guardians.removeContract(owner, contractId);   // no invalidation
       } catch (error) {
           await InternalException(error, this.logger, user.id);
       }
   }
   ```

2. **The create handlers invalidate the wrong key.** `createContract` (line ~185) and
   `createContractV2` (line ~247) both do:

   ```ts
   await this.cacheService.invalidate(getCacheKey([req.url], user))
   ```

   `req.url` on those requests is `/contracts`, so only the unfiltered listing key is
   dropped. Every caller filters by type, and `getContracts` is decorated with
   `@UseCache({ isFastify: true })` (line 107) while accepting `type`, `pageIndex` and
   `pageSize` as query parameters — so the live cache keys are
   `/contracts?type=RETIRE`, `/contracts?type=WIPE`, `/contracts?type=RETIRE&pageIndex=0&pageSize=100`
   and so on. None of those are ever invalidated.

## Reproduction

```bash
# as a Standard Registry
curl -X POST  ".../api/v1/contracts" -H 'api-version: 2' -d '{"description":"probe","type":"RETIRE"}'
curl         ".../api/v1/contracts?type=RETIRE"      # -> contains "probe"
curl -X DELETE ".../api/v1/contracts/<id>"           # -> 200 OK
curl         ".../api/v1/contracts?type=RETIRE"      # -> STILL contains "probe"
```

The contract really is deleted — re-reading the same URL after the TTL expires (or with a
cache-busting query parameter such as `?type=RETIRE&cacheBust=1`) returns the correct,
empty list.

## Impact on the e2e suite

`005_removeContracts.cy.js` deletes a retire contract, gets `200 OK`, then re-lists and
asserts the id is gone:

```
AssertionError: expected '6a99e1e5c65f440315c6f6ab' to not equal '6a99e1e5c65f440315c6f6ab'
```

The spec is written correctly and has been left as-is, asserting the behaviour the API is
supposed to have. It will go green on its own once this is fixed.

## Proposed fix

Invalidate the listing keys on every contract mutation, not just the exact request URL.
`removeContract` needs invalidation added, and the create handlers need to drop the
type-filtered variants too — e.g. invalidate by prefix/tag for `/contracts` rather than by
a single exact URL, so that `?type=…` and paginated keys are covered.

Both create handlers currently invalidate *before* performing the mutation, which is also
wrong: a concurrent read between the invalidation and the write repopulates the cache with
pre-mutation data. The invalidation should happen after the mutation succeeds.
