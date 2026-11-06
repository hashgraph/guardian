# The notification deletion test counts a list that can grow during the spec

**Status:** open, cause not established
**Component:** `e2e-tests/cypress/e2e/api-tests/021_notifications/deleteNotifications.cy.js`, "Delete notifications"

## What was observed

In the full `api-tests` run of 5–6 Nov 2026 (after the waits in the suites were bounded, so the specs run back to back much faster), the test failed with `expected 243 to deeply equal 241`. The same spec passed in the full run earlier on 5 Nov, before that change; the spec file itself was not modified.

The `before` hook stores the number of new notifications of the Standard Registry and the id of the third one; the test deletes up to that id and expects the response to be the stored number minus two. The response was two higher than expected.

On 6 Nov 2026 the same test passed in a full `api-tests` run on a freshly seeded database, so the failure needs the notification traffic of a database that has already been used (cause still not established).

## To find out

Whether notifications created by asynchronous work of earlier specs (tasks, policy steps) land between the `before` hook and the delete. If so, the test should assert on the notifications it deleted (for example that the deleted ids are gone) instead of on the total.

## Test impact

The test can fail whenever the Standard Registry receives notifications while the spec runs.
