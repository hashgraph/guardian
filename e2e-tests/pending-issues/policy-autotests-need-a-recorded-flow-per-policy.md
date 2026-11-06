# Policy autotests need a recorded flow for every Methodology Library policy

**Status:** open, test coverage gap (checked on 6 Nov 2026 on a local Solo stack)
**Component:** `e2e-tests/cypress/e2e/policy-tests`, `e2e-tests/cypress/fixtures`
**Severity:** medium — 30 of the 33 `policyAT` specs only import a policy and `cdm1.cy.js` replays a record with no actions, so a library policy that stops working goes unnoticed
**Found by:** reading the history of `policy-tests` and replaying the record fixtures

## What is missing

A policy autotest replays a recorded dry-run flow of the policy (a `.record` file) and expects the policy test to end as `Success`, which the engine sets only when the replayed documents match the recorded ones (`result.total === 100`). `irec/iRec2.cy.js` does this with the helpers in `cypress/support/CustomHelpers/policyTests.js`.

The specs below have no usable record, so they only import the policy:

| Spec | Policy archive (`Methodology Library/…`) |
|---|---|
| `cdm/cdm1.cy.js` | `Clean Development Mechanism (CDM)/CDM ACM0001/ACM0001.policy` |
| `cdm/cdm2.cy.js` | `…/CDM ACM0002/ACM0002.policy` |
| `cdm/cdm7.cy.js` | `…/CDM ACM0007/ACM0007.policy` |
| `cdm/cdm18.cy.js` | `…/CDM ACM0018/ACM0018.policy` |
| `cdm/cdmAR3.cy.js` | `…/CDM AR-ACM0003/CDM AR-ACM0003.policy` |
| `cdm/cdmIA.cy.js` | `…/CDM AMS-I.A/CDM AMS-I.A.policy` |
| `cdm/cdmIC.cy.js` | `…/CDM AMS-I.C/CDM AMS-I.C.policy` |
| `cdm/cdmID.cy.js` | `…/CDM AMS-I.D/AMS-I.D.policy` |
| `cdm/cdmIE.cy.js` | `…/CDM AMS-I.E/AMS-I.E.policy` |
| `cdm/cdmIF.cy.js` | `…/CDM AMS-I.F/CDM AMS-I.F Policy.policy` |
| `cdm/cdmIIG.cy.js` | `…/CDM AMS-II.G/CDM AMS-II.G Policy.policy` |
| `cdm/cdmIIJ.cy.js` | `…/CDM AMS-II.J/CDM AMS-II.J Policy.policy` |
| `cdm/cdmIIIAR.cy.js` | `…/CDM AMS-III.AR/CDM AMS-III.AR Policy.policy` |
| `cdm/cdmIIIAV.cy.js` | `…/CDM AMS-III.AV/CDM AMS-III.AV Policy.policy` |
| `cdm/cdmIIIBB.cy.js` | `…/CDM AMS-III.BB/AMS-III.BB.policy` |
| `cdm/cdmIIID.cy.js` | `…/CDM AMS-III.D/CDM AMS-III.D Policy.policy` |
| `cdm/cdmIIIF.cy.js` | `…/CDM AMS-III.F/CDM AMS-III.F Policy.policy` |
| `cdm/cdmIIIH.cy.js` | `…/CDM AMS-III.H/AMS-III.H.policy` |
| `irec/iRec.cy.js` | `International Renewable Energy Certificate (iREC)/Policies/iRec Policy.policy` |
| `irec/iRec3.cy.js` | `…/IRec Policy 3 (1707126011.005978889).policy` |
| `irec/iRec4.cy.js` | `…/IRec Policy 4 (1707126227.976010003).policy` |
| `irec/iRec4RM.cy.js` | `…/iRec Policy 4 (Retry Mint).policy` |
| `irec/iRec5.cy.js` | `…/IRec Policy 5 (Groups) (1707126709.066208559).policy` |
| `irec/iRec6.cy.js` | `…/IRec Policy 6 (Search documents) (1707128237.926630472).policy` |
| `irec/iRec7.cy.js` | `…/IRec Policy 7 (Split documents) (1707130249.448431277).policy` |
| `irec/iRec8.1.cy.js` | `…/IRec Policy 8.1 (MBP) (1707130450.268901183).policy` |
| `irec/iRec8.2.cy.js` | `…/IRec Policy 8.2 (MBP) (1707130781.567041003).policy` |
| `irec/iRec9.cy.js` | `…/iRec Policy 9 (Module) (1707132260.399505507).policy` |
| `irec/iRec10.cy.js` | `…/iRec Policy 10 (Recipient) (1707133931.238879003).policy` |
| `irec/iRec10NTC.cy.js` | `…/iRec Policy 10 (Recipient) (new trust-chain) (1707134204.675006033).policy` |
| `irec/iRec10Source.cy.js` | `…/iRec Policy 10 (Source) (1707137229.117447820).policy` |

## Why no record is available

- **The archives ship no tests.** A policy export stores its tests as `tests/<uuid>.record` (`common/src/import-export/policy.ts`). None of the 314 zip archives in `Methodology Library` has one, so the original specs, which read the first test of the imported policy, could never run.
- **The testnet originals cannot provide them.** The archives named after a message id were published on testnet on 5 Feb 2024, before tests were stored in policy exports (Guardian 2.27.0, July 2024). Their IPFS content is not reachable either: for the `iRec Policy 2` message (`1707125414.999819805`, CID `bafkreietysyt45i2qx3pcgahj6mvdk6flal3v7nxuxmkwqixjzvxjhchtq`), the local Kubo node found no provider and the public gateways answered 429, 404 or 504.
- **The record fixtures do not fit these policies.**
  - `iRecFullFlow.record` fits only `iRec Policy 2`. Replayed on the other iREC policies:
    - `iRec Policy`: `Group "Registrant" does not exist`;
    - iRec 3, 4, 4 (Retry Mint), 8.1, 8.2 and the three iRec 10: `Block (create_device_form) not available.`;
    - iRec 5: `Block (approve_registrant_btn) not available.`;
    - iRec 6: a schema needs a `factor` field the record lacks;
    - iRec 7: ends with `total: 77` (7 documents and no token instead of 9 documents and 1 token);
    - iRec 9: `Block (create_application) not available.`.
  - `irec2.record` replays on `iRec Policy 2` at `total: 94`: its registration form was recorded with empty sub-forms (`{"field1":{},"field2":{},"field3":{}}`), which the current engine turns into a different document.
  - `cdm1Sample.record` holds only a `START` line. It scores `Success`, `total: 100`, with 0 documents, on any policy (checked on `iRec Policy 2`), so `cdm1.cy.js` checks nothing.

## What a fix needs

For each spec in the table:

1. Import the archive and start a dry run. CDM archives reference tools: import them as `cdm1.cy.js` does (`prepareTools`, `importPolicyArchive` in `support/cdmTools.js`).
2. Record the main flow through every role, up to the mint when the policy mints, with real values in every required field: a record with empty sub-forms goes stale.
   - In the UI: the record control of the policy viewer of the dry-run policy.
   - Through the API: `POST record/:policyId/recording/start`, the flow, then `POST record/:policyId/recording/stop`, which answers with the zip (as in `api-tests/016_policies_tests_and_flows/dryRunPolicyFlowAndRecord.cy.js`). `DocumentGenerator.generateDocument(schema)` in `interfaces/src/helpers/generate-document.ts`, which the request form uses in dry run, can fill the forms.
3. Save the record as `cypress/fixtures/<spec>.record` and say in a comment of the spec what the flow covers and on which network it was recorded (a record made on testnet replays on Solo: `iRecFullFlow.record` does).
4. Replace the import-only test with the steps of `iRec2.cy.js`: `uploadPolicyTest`, `runPolicyTest`, the same assertions, and `deleteDryRunPolicy` in `after`.
5. Run the spec twice, then once with the record of another policy to see it fail.

Open questions:

- Recording by hand is quicker; recording from an API spec can be repeated when a policy changes but needs a scripted flow per policy.
- The replay of a CDM policy with tools has not been tried. Start with `cdm1`.
- A replay takes about 70 s for `iRec Policy 2`. Measure a CDM one before deciding whether all of them fit in the nightly `policy-all` run.
