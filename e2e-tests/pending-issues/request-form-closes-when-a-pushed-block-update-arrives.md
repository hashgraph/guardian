# An open request form closes when a pushed block update reloads the block that hosts it

**Status:** open, product defect (observed on 6 Nov 2026 on a local Solo stack)
**Component:** `policy-service` — `src/policy-engine/policy-components-utils.ts` (`BlockUpdateFn`); `frontend` — `policy-viewer/blocks/request-document-block/request-document-block.component.ts` (`ngOnDestroy`)
**Severity:** medium — the form a user has just opened disappears with whatever they typed in it, with no message
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/02_policies/dryRunMint.cy.js`

## What was observed

`dryRunMint` runs iREC Policy 3 in a dry run: the Registrant creates a device, the Administrator approves it, then the Registrant opens "Create Issue Request" on the device row. The form opens and is gone about half a second later, before anything is typed.

Requests recorded by a probe spec (milliseconds from the start of the device approval):

```
59718 POST blocks/f1897800-…/sync-events            device approval
59894 GET  dry-run/users, 60105 POST dry-run/login  switch to the Registrant
60453 … 61390 GET blocks/… and tag/…/blocks         the Registrant's view loads
62343 GET  blocks/bf64d2d1-474e-4964-bc79-b6fdf2fde361
62409 GET  tag/create_issue_request_form/blocks, tag/revoke_issue_device_btn/blocks
```

The second round of requests (62343) reloads blocks that had just been loaded, and comes about 2.6 s after the approval. In a run that opened the form right after the switch, the same three requests came about 270 ms after the form opened, and the form was gone about 240 ms later. In the run above, which waited 15 s after the switch before opening the form, the form stayed open for the 10 s it was watched.

## Why

`PolicyComponentsUtils.BlockUpdateFn` collects the blocks to update per user DID and sends them 2000 ms after the first change (`setTimeout(…, 2000)`). The viewer then reloads the parent blocks, which recreates the "Create Issue Request" button block. `RequestDocumentBlockComponent.ngOnDestroy` closes its open form (`formTakeover.close(this.takeoverRef)`), so the form goes with the old block.

A dry run makes it easy to hit, because the user switch takes well under 2 s. A real user who opens a form within 2 s of a change that updates the same blocks (their own previous submit, another user's approval) loses it the same way.

## How to reproduce

1. Import iREC Policy 3 and start a dry run.
2. As a virtual user, register and create a device; approve both as Administrator.
3. Switch back to the virtual user, open the Devices tab and click "Create Issue Request" within 2 s of the approval: the form closes by itself.

## Test impact

`dryRunMint.cy.js` is skipped with a pointer to this note. The outcome depends on timing: the spec failed on a local stack and passed on a CI runner (run 42263973153), where the user switch is presumably slower than the 2 s update delay. Making the test wait for the update would only hide the defect.

## What a fix needs

Either the viewer keeps an open form when it reloads the block that hosts it (the block is recreated with the same id), or the update does not recreate blocks whose data did not change.
