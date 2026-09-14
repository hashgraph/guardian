# Contract bytecode and the guardian-service ABI have to be of the same generation

**Status:** environment constraint, quickstart config fixed
**Component:** `guardian-service` (contract event ABIs), `configs/*.guardian.system` (bytecode file ids)
**Supersedes:** `wipe-requests-cannot-be-raised-in-tests.md`
**Affects:** `e2e-tests/cypress/e2e/api-tests/013_contracts/` — `008`, `010`, `012`, `013`, `014`

## What the parked note was asking

The previous note asked what the minimal, repeatable way is to make a retire contract raise a
wipe request, having watched pools, syncs and direct wiper calls all fail to produce one.

The answer is that **the request was being raised all along**. `Retire.setPool` calls
`requestWiper` on the wipe contract for every token of the pool
(`contracts/src/retire/Retire.sol:114-124`), and the wipe contract emits `WipeRequestAdded`.
That event was on-chain for every run of the folder — it was Guardian that never stored it.

Setting a pool is all it takes. No policy publish and no mint workflow are involved:

```
POST /contracts/{retireId}/pools   { tokens: [{ token, count: 1 }] }
   -> Retire.setPool -> Wipe.requestWiper(token) -> event WipeRequestAdded(retire, token)
   -> the wipe-sync task stores a WiperRequest within a minute
```

The one rule that governs how many requests a run can have is per **token**, not per contract:
`requestWiper` reverts with `AlreadyWiper` for a token the caller can already wipe, and
`Retire.setPool` swallows that revert in a `try/catch`. A step that needs a request of its own
therefore creates a wipe-bound token of its own — which is what `010` now does for its reject
and clear cases, instead of competing for the single request an earlier spec left behind.

## Why the events were dropped

`Version.sol` used to declare `event Version(uint256[3])`. Commit `78d1301b3` renamed it to
`VersionInfo` in the Solidity source *and* in `versionEventsAbi`
(`guardian-service/src/api/contract.service.ts`), and `8b42754ea` uploaded the rebuilt bytecode
to Hedera as new file ids. The `configs/*.guardian.system` files, which is where the quickstart
takes its environment from, were left pointing at the pre-rename bytecode (`0.0.6371642`), so:

1. the deployed contract emits `Version(uint256[3])`;
2. `getContractVersion()` cannot match that topic against `VersionInfo(uint256[3])`, and its
   `catch` returns `'1.0.0'`;
3. the contract record is stored with `version: '1.0.0'` (and `permissions: 15` rather than 7);
4. `syncWipeContract` therefore decodes with `wipeEventsAbi_1_0_0`, which knows
   `WipeRequestAdded(address)` — while the deployed contract, which really is 1.0.1, emits
   `WipeRequestAdded(address, address)`;
5. `Interface.getEventName` throws `no matching event`, and no `WiperRequest` is ever saved.

**The versions are not interchangeable.** Guardian as it stands cannot read a contract deployed
from pre-`78d1301b3` bytecode: version detection fails silently and every wipe request on that
contract is lost. The quickstart configs now carry the post-rename file ids, matching what
`guardian-service/configs/.env.guardian*` has used since February 2026.

## Second defect, still open

`syncWipeContracts` and `syncRetireContracts` iterate their contracts in a plain `for` loop with
no per-contract error handling, so the throw above does not just lose that contract's events —
**it aborts the whole synchronization pass**, every minute, for every contract of that type:

```
2026-09-04T22:15:00 [GUARDIAN_SERVICE]: TypeError: no matching event
  (argument="key", value="0xe08a5a5a5961d44a76...", code=INVALID_ARGUMENT)
    at syncWipeContract ... at Object.syncWipeContracts ... at CronJob.taskExecution
```

A single legacy contract left in the database is enough to stop wipe requests from being
ingested for contracts that are perfectly current. On this local instance that was visible
directly: a freshly created 1.0.1 pair raised its request on-chain and still saw nothing in
`GET /contracts/wipe/requests` until the four legacy records were removed.

Worth fixing on two counts: wrap each contract in its own `try/catch` so one bad contract cannot
starve the rest, and let `getContractVersion` report that it could not identify a contract
instead of quietly claiming 1.0.0 — the silent fallback is what turns a configuration mismatch
into a feature that just does not work.

## Upgrading an instance that has legacy contracts

Records created before the config fix keep `version: '1.0.0'` and go on breaking the sync. They
have to be dropped (their on-chain contracts are unusable by this build anyway):

```js
// mongosh guardian_db
db.contract.deleteMany({ version: '1.0.0' })
```

The e2e suite recreates the contracts it needs on every run, so on a test instance this costs
nothing beyond the deploy the run would have paid for anyway.
