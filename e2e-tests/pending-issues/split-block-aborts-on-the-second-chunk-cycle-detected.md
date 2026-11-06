# The split block creates only the first chunk: "Cycle detected: target save_chanks was already used"

**Status:** open, product defect (observed on 6 Nov 2026 on a local Solo stack, unmodified `develop`)
**Component:** `policy-service` — `src/policy-engine/blocks/split-block.ts` (`addDocs`) and `src/policy-engine/record-action-step.ts` (`checkCycle`, added with feat 5544 "Synchronous Event Execution")
**Severity:** medium — a document that must be split into several chunks yields only the first one, so only part of the amount is minted and the rest is silently dropped
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/02_policies/iREC7Split.cy.js`

## What was observed

iREC Policy 7 (Split documents) splits the issue request on `field7` with a threshold of 1000 and mints `field7/1000` per chunk. An issue request for 2000 kWh should produce two chunks of 1000 and two mints (balance 2).

What happened: one `chanks` document (1000, `Minted`) and one `mint_request` (amount 1, mint and transfer `SUCCESS`); the Registrant's balance stayed at 1 for the whole 120 s the test waited. `policy-service-1.log` shows, right after the first chunk was saved:

```
Error: Cycle detected: target "save_chanks" was already used, circular reference is not allowed.
    at RecordActionStep.checkCycle (policy-engine/record-action-step.js)
    at basicClass.triggerEvents (policy-engine/helpers/decorators/basic-block.js)
    at basicClass.addDocs (policy-engine/blocks/split-block.js)
```

`split()` computes two chunks for this input (`needed` = 1000, `count` = 1, `end` = 0) and `addDocs` triggers the output event once per chunk. The second trigger reaches `save_chanks` again within the same action step, and `checkCycle` rejects any target it has seen, although the chunks are independent documents and not a loop.

## How to reproduce

Run the spec (the whole flow takes about 5 minutes), or by hand: publish iREC Policy 7, onboard a Registrant, approve the application and the device, create an issue request with "Total kWh Produced in this period" = 2000, approve it, and read the Registrant's balance of the policy token: 1 instead of 2. The error above is in the policy service log.

## Fix direction

The cycle check should not apply to the repeated events of one block that fan a list of documents out (or the check should key on the document as well as on the target). Add a policy-service unit test with a split of at least two chunks.

## Test impact

`iREC7Split.cy.js` is `context.skip`. Delete this note and the skip once a split of 2000 mints 2.
