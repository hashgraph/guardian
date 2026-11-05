# DR-test: the profile restore cannot be exercised end to end on the instance that created the registry

**Status:** open — environment limitation; `cypress/e2e/DR-test/recovery.cy.js` covers the path up to the refusal.
**Component:** `guardian-service` — `RestoreDataFromHedera.restoreRootAuthority`
**Severity:** low — by design, but it leaves the successful restore untested
**Found by:** `cypress/e2e/DR-test/recovery.cy.js`

## Summary

The spec creates a Standard Registry with a generated Hedera account, then creates a second account and restores the first registry's data into it from the same Hedera credentials ("Restore data" → "Load topics" → "Proceed"). Everything up to the restore works: the topic of the original registry is found on Hedera and selected. The restore task then fails with

```
500 Other Error: The DID document already exists.
```

`restoreRootAuthority` (`guardian-service/src/helpers/restore-data-from-hedera.ts`) looks the DID up in `DidDocumentCollection` and refuses to restore when it is present. That is correct for a disaster-recovery scenario, where the instance is new and empty, but here the original registry still lives in the same database.

## What a full test needs

A second, empty Guardian instance (own MongoDB, same Hedera network), or a step that removes the registry's DID document and its related collections before the restore. Neither exists in this suite, and deleting rows from the database behind the application would not prove a real recovery. The spec therefore asserts the refusal and stops there.

## Also seen

`RestoreDataFromHedera` is a `@Singleton` that caches the main-topic messages for 2 minutes (`UPDATE_INTERVAL`). A registry created within that window does not appear under "Load topics", so the spec's `loadRestorableTopic` clicks again until a topic is selected.
