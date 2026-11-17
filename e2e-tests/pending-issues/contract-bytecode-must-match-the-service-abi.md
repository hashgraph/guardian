# Contract bytecode and the guardian-service ABI have to be of the same generation

**Status:** environment constraint, quickstart config fixed. The service now fails loudly on a mismatch (below); what remains is keeping the bytecode file ids of every configuration in step with the ABI.
**Component:** `guardian-service` (contract event ABIs), `configs/*.guardian.system` (bytecode file ids)
**Affects:** `e2e-tests/cypress/e2e/api-tests/013_contracts/` — `008`, `010`, `012`, `013`, `014`

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

## What the service does about a mismatch

- `getContractVersion` no longer claims `1.0.0` for a version event it cannot decode: creating the contract fails with `Cannot identify the version of the contract … probably not of the same generation as this service`. A contract that announced no version at all is still read as `1.0.0`.
- `syncWipeContracts` and `syncRetireContracts` try every contract; one that cannot be decoded no longer stops the others. The pass reports all failures together (`Synchronization of N wipe contract(s) failed: <id>: <reason>; …`).

A contract already stored with `version: '1.0.0'` from the old behaviour is still wrong, and its sync still fails (now only for itself).

## Upgrading an instance that has legacy contracts

Records created before the config fix keep `version: '1.0.0'` and go on breaking the sync. They
have to be dropped (their on-chain contracts are unusable by this build anyway):

```js
// mongosh guardian_db
db.contract.deleteMany({ version: '1.0.0' })
```

The e2e suite recreates the contracts it needs on every run, so on a test instance this costs
nothing beyond the deploy the run would have paid for anyway.
