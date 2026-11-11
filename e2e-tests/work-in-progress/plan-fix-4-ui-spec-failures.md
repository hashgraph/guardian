# Plan — resolving the four deterministically failing UI specs

**Status (10 Nov 2026):** the root-cause fix is implemented, lint-clean, and
verified on the 00 specs (8/8 green in two consecutive runs). The fix is
committed. Pass 1 of the four-spec verification exposed two *newly exposed*
downstream failures in the 02 suite (the CDM tools grid and the iREC5
import-preview readiness), which are separate work items and are resolved one
at a time with their own commits. What remains for *this* plan: the pass-2
verification (re-run the 011 API spec to re-activate the USER schema, then the
four UI specs against the five-step shape), the workspace re-cleanup, and the
full `all` run.

Scope of this plan: the four specs that fail in every full `all` run —
`00_account_registration/createAccount_Generate`,
`00_account_registration/createAccount_ProvideCredentials`,
`02_policies/flow_CDM_0001`, `02_policies/iREC5Group`.
No product code changes, no new dependencies, no skipped tests.

## 1. Root cause (single cause, verified against the live stack)

A system-schema created and **activated** by an API spec changes the shape of
the user onboarding wizard, and the UI wizard drivers do not handle the extra
step:

1. `cypress/e2e/api-tests/011_schemas/putActiveSystemSchema.cy.js` (tags include
   `all`) runs in the API suite, which always runs before the UI suite. As
   `SRUser` (`StandardRegistry`) it creates a system schema with
   `entity: 'USER'` (uuid `0000b23a-b1ea-408f-a573…`, name `test`) and
   activates it (`PUT /schemas/system/:id/active`).
2. The product **cannot deactivate or delete an active system schema**: the
   gateway's update/delete/activate routes all answer `422 "Schema is active."`
   for an already-active schema (`api-gateway/src/api/service/schema.ts`), and
   `guardian-service` `ACTIVE_SCHEMA` only sets `active` flags, never clears
   them. The schema is a permanent resident of the workspace for the life of
   the database.
3. When the user wizard boots, `user-profile.component.ts loadDate()` fetches
   `GET /schemas/system/entity/USER` (L515) and, because the guardian-service
   handler returns the active system schema, runs
   `this.vcDocumentType.setValue(true)` (L533-540).
4. That changes the wizard: in the `did_document` step
   `isFinish()` = `!didDocumentType.value && !vcDocumentType.value` (L296-298)
   becomes false, so the footer renders **Next** instead of **Confirm**
   (template L899-914), and a fifth step, `vc_document` (a schema form
   driven by the activated schema), is appended.

Failure signatures, both runs of 9-10 Nov 2026, all four specs:

- **00 specs**: `runWizard()` reaches the DID step (its body renders) and then
  `cy.contains('button', 'Confirm')` — 10 s timeout — "Expected to find
  content: 'Confirm' ... but never did". The button does not exist: the step
  renders Next instead.
- **02 specs**: `ensureAccount -> _runUserOnboarding` clicks the footer button
  on the DID step — which is now Next and *works*, silently advancing into the
  VC step — then `waitForTaskRoundtrip()` waits for the app to navigate to
  `/task` (20 s timeout). The VC form's editable field is empty, the final
  Confirm is a no-op (`onConfirm()` reveals errors and returns), and the push
  `PUT /profiles/push/:user` is never issued.

Verification evidence:

- Live `GET /schemas/system/entity/USER` with a `StandardRegistry` session
  returns exactly the 011 spec's schema (uuid prefix and name `test`), on the
  still-running stack.
- Exactly four specs in the whole UI tree drive the user wizard in the
  `StandardRegistry` workspace (grep: `ensureAccount` /
  `hederaUserRegistration` / `_runUserOnboarding`) — and exactly those four
  failed; the other 111 UI tests, including the SR wizard
  (`hederaSRRegistration`), passed.
- In both 00 specs the Generate task result *did* land (the drivers assert
  `#operatorId` non-empty before moving on): the wizard is alive; it simply
  has five steps instead of four. No WebSocket loss, no `callbackPending`
  window, no `ngOnChanges` gate is involved in these failures.

This retro-explains the failures that produced the 31 Oct / 2 Nov
`pending-issues` notes: the same coupling existed then (the API suite has
always run 011 before the UI suite in a full run).

## 2. Why the options narrow down

The product restricts system schemas to two entities —
`SystemSchemaDTO.entity` is `@IsIn([STANDARD_REGISTRY, USER])`
(`api-gateway/src/middlewares/validation/schemas/schemas.dto.ts`) — so:

- Switching 011 to a third entity is impossible (creation would 422).
- Switching 011 to `STANDARD_REGISTRY` only moves the breakage: the SR wizard
  (`root-profile`) consumes the active STANDARD_REGISTRY schema the same way,
  and would break `hederaSRRegistration`'s `fillSchemaFormFields`
  (OrganizationName/Website/Tags) instead.
- Removing the activation guts the spec (its purpose is the activate route).
- Deactivating after the test is impossible through the product API.

So the spec stays as is — it correctly exercises its API contract, and
"published schemas" is a documented acceptable leftover — and the **UI wizard
drivers learn to handle the fifth step**, making the UI suite genuinely
order-independent of the API suite (the repo convention: a spec must pass in
any order, twice in a row).

## 3. The fix as implemented (e2e-tests only)

All changes are in shared page objects plus the 011 typo; the two page-object
files were approved explicitly, and the 011 one-liner was approved too.

### 3.1 `cypress/e2e/ui-tests/pages/configPage.js` — shared shape-agnostic helpers

Three exported helpers (used by both wizards):

- `clickWizardFooterButton()` — dismisses sticky toasts and clicks the wizard
  footer button matched by text (Next or Confirm; p-button keeps no label
  attribute in the DOM). Throws if absent or disabled.
- `fillWizardSchemaForm()` — fills every editable control of
  `app-schema-form-root .form-field` with a placeholder, skipping
  readonly/disabled controls (the form engine auto-populates them), and
  asserts at least one editable field exists.
- `completeUserWizard()` — clicks the footer, then polls at most 10 s
  (`TIMEOUTS.ui`) for the appended VC step: if `app-schema-form-root` appears
  it fills the form and clicks the footer again (the real Confirm). Whatever
  else the app is doing is **not** awaited here: the task navigation that
  follows the Confirm is a backend round trip whose budget and recovery the
  callers own — `waitForTaskNavigationOrRecover()` (20 s + reload + redo) on
  the 00-spec path, `waitForTaskRoundtrip()` on the 02-spec path. The reason
  the helper does not poll for `/task` itself: the gateway validates the push
  JWT over NATS with no timeout, so the 202 has been seen to land right at a
  short deadline (observed in the 10 Nov verification: the 202 + navigation
  completed ~100-300 ms after a 10 s window expired, and the hard throw
  pre-empted the caller's recovery).

- `runWizard` (inside `hederaUserRegistration`) ends with `completeUserWizard()`
  instead of a fixed `Confirm` assert + click.
- `hederaSRRegistration`'s task return leg now uses `waitForTaskRoundtrip()`
  (120 s return budget) instead of a fixed 20 s `cy.location` assert: the
  "Connect user" chain (topic, DID, five schemas, roles, save) takes about
  20 s server-side on a loaded Solo container, exactly the short budget, so
  the old assert lost the race at the deadline (measured: task
  `70805748` started 02:51:06, completed 02:51:26).

### 3.2 `cypress/e2e/ui-tests/pages/homePage.js` — `_runUserOnboarding`

Uses `completeUserWizard()` for the wizard tail instead of a final
`_wizardStepNext()`; `waitForTaskRoundtrip()` follows as before.

### 3.3 `cypress/e2e/api-tests/011_schemas/putActiveSystemSchema.cy.js`

The `StandartRegistry` → `StandardRegistry` URL typo (cosmetic: the gateway
ignores the `:username` param and takes the owner from the token, so the spec
worked either way).

### 3.4 Not changed

- `07_system_schemas` UI specs — they already avoid the USER entity and
  restore the built-in SR schema; verified no interaction.
- Any product code. The wizard adding a VC step for a workspace with an
  active USER system schema is by design, not a bug.

## 4. Verification — what ran and what is left

1. **Done — workspace cleanup.** The active USER schema row (011's) was
   deactivated with a one-off direct Mongo write
   (`updateMany({uuid: '0000b23a-…-a2060a'}, {$set: {active: false}})` on
   `guardian_db.schema`; the built-in active schemas were left alone); live
   `GET /schemas/system/entity/USER` returned `null` afterwards. The route is
   not gateway-cached, so no service restart was needed.
2. **Done — pass 1 (the four specs, 4-step shape).** The wizard failures are
   gone in all four specs. Three *newly exposed* downstream failures appeared:
   the Generate SR test flaked on the 20 s return leg (fixed in 3.1, then
   8/8 green in two consecutive 00-spec runs — 10 Nov `verify-fix1b/1c`),
   `flow_CDM_0001` failed in the tools grid `_row` after a successful
   `ensureAccount`, and `iREC5Group` failed on the import-preview
   `div.view-segment` readiness. These are separate work items, each with its
   own commit.
3. **Left — pass 2 (five-step shape).** Re-run the 011 API spec (it
   re-creates and re-activates the USER schema), then run the four UI specs
   twice: the VC step must be handled by `completeUserWizard()` in both the
   00 and the 02 paths.
4. **Left — workspace re-cleanup** of the re-created schema row after pass 2.
5. **Left — full `all` run** (~1 h 17): expect all green except the 23
   intentional skips (17 `026_remote_policy` + 2 `028_MGS` needing MGS
   credentials + 3 in-spec skips). Watch specifically: the 011 API spec,
   `07_system_schemas` (its listing assertions with the `test` schema
   present), the 02 suite.
6. **Done — lint.** `npx eslint cypress` from `e2e-tests`: the touched files
   introduce zero new errors (the 4 pre-existing errors on HEAD — three
   unused `username` in homePage.js, one max-len in the 011 spec — are
   unchanged).

## 5. Pending-issues notes — the corrected record

- `registration-wizard-stalls-when-the-task-result-is-lost.md`: the
  "Reproduced by" / "New evidence" attribution of the four spec failures to
  the dead-wizard-tail mechanisms is superseded by a "Re-attribution"
  section: the spec failures were the schema coupling (fixed in the tests
  above); the mechanisms (one-shot user-gated WS delivery, `callbackPending`
  visibility window, dead `ngOnChanges` code, unguarded destructure in
  `onAsyncCompleted`) remain real, latent product robustness bugs — the note
  stays open, re-scoped to those, severity re-graded (not reproduced in a
  276-spec run; no known repro conditions beyond the 31 Oct observation).
- `onboarding-leaves-an-orphan-did-when-the-user-update-is-lost.md`: the
  9-10 Nov bullet was corrected with the same re-attribution (the 02 specs'
  push was a no-op on the unfilled VC step, not on a dead tail; the run
  added no orphan rows either way). The suspected lost `UPDATE_USER` reply
  stays a separate open bug.
- No note is deleted.

## 6. Rejected alternatives (for the record)

- Skip the four specs with a pointer: hides a deterministic, fully understood
  failure; the convention is to fix the coupling, not paper over it.
- Product change (a deactivate route for system schemas): would be a real
  product improvement (see also
  `pending-issues/system-schema-editor-cannot-create-a-system-schema.md`), but
  it is not required by the tests and is out of scope here.
- Run the UI suite in a separate workspace: large infrastructure change for
  a one-line coupling.

## 7. Still open, out of scope (separate work items)

- Latent wizard-robustness fixes listed in
  `registration-wizard-stalls-…md` "Suggested fixes" (polling fallback,
  per-task WS replay, `ngOnChanges` key, guarded `onAsyncCompleted`) —
  product-side, each with a failing test first; no known repro conditions,
  so scheduling is a product call.
- The stranded-`CONNECT_USER` / orphan-DID chain in
  `onboarding-leaves-an-orphan-did-…md` (unbounded NATS reply wait in
  task-internal calls; compensating FAILED mark).
- Note: in this workspace `User2` and friends still carry no DID, so the
  wizard re-opens on every boot until a fresh database or the server-side fix
  lands; the one-off cleanup sidesteps the *schema* coupling, not this.
- The two 02-suite downstream failures exposed by pass 1 (CDM tools grid
  row, iREC5 import-preview readiness) are separate work items with their
  own commits; they are not part of this plan's definition of done.

## 8. Open questions — resolved

1. Approve the two page-object changes? — **yes** (10 Nov).
2. Fresh database or direct Mongo cleanup for the verification run? —
   **direct Mongo cleanup of the one schema row** (10 Nov).
3. Include the optional 011 URL-typo fix? — **yes** (10 Nov).
