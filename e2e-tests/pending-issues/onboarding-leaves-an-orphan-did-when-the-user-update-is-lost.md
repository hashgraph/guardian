# A half-finished onboarding is not resumed: the wizard starts again with a new DID

**Status:** open, needs a design decision. Fixed on 12 Nov 2026: the user update of onboarding (`UPDATE_USER` through `common/src/helpers/users.ts`) waits at most 30 s instead of forever, and `saveUserProfile` (`guardian-service/src/api/helpers/profile-helper.ts`, `linkDidToUser`) reads the user back when that update fails or does not answer. If the user points at the new DID, onboarding goes on (only the reply was lost); otherwise the DID document is marked `FAILED` and the task fails with the original error, so the DID is no longer left looking valid (`CREATE`) with no user pointing at it.
**Component:** `guardian-service` (`setupUserProfile`), `frontend` (`views/user-profile`)
**Severity:** low — the user can run the wizard again; each failed attempt leaves one `FAILED` DID document and its `USER_TOPIC`

## What is left

- **Resuming instead of restarting.** After a failed attempt the wizard creates a new DID from scratch (`user-profile.component.ts`, the wizard never looks for an existing DID). Re-linking the DID of the failed attempt would need the DID document to say which user it was created for: it carries no user or username today (`common/src/entity/did-document.ts`), and the DID string alone does not identify the user. Adding that link, and deciding whether a `FAILED` DID may be re-used at all, is the decision to take.
- **Databases from before the fix.** DID documents left by earlier lost updates are still `CREATE` with no user pointing at them. They can be found by their DID not being the `did` of any user in `auth_db.user`.

## How it showed up

The 02 suite's `User2` in a used workspace (2 Nov 2026): 8 `did_document` rows with status `CREATE` plus a `USER_TOPIC`, while `auth_db.user` had no `did`, `parent` or `hederaAccountId` for the user, and the setup wizard rendered on every boot. No `GUARDIAN_SERVICE` entry at warning level or above was logged for the task window, which fits a lost `UPDATE_USER` reply.
