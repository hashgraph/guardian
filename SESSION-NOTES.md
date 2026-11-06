# Session notes — Cypress suites (idempotency, network-agnostic specs, UI suites on the current UI, bounded waits)

> **Current state (6 Nov 2026)**: PR #7293 was merged as `9ad79ecb7`. The follow-up work is on branch `fix-tests-followup` (draft PR https://github.com/hashgraph/guardian/pull/7297, text in `PR-DESCRIPTION-7297.md`), committed in small steps and unsigned (`git -c commit.gpgsign=false commit`: the dev container has no `gpg`; the user rewrites and signs, so hashes change). The sections "What the 6 Nov session did" and "What the 5 Nov session did" describe that branch. Everything from "Goal (as handed off)" on describes the first PR: historical context, but the techniques and traps still hold.
>
> This file is in English per the repo `AGENTS.md`, for the next developer or agent session. It stays untracked. Standing rules from the user: everything persisted is in English; Markdown is not hard-wrapped; delete a `pending-issues` note once its issue is resolved; never re-serialize fixtures with `json.dump` (edit them textually); commit only at consistent points, one commit per consistent change, and never files that are not part of the change; the user runs `solo:up/down` and `guardian:infra:up/down` on the host, the agent runs the services (`guardian:services:up/down`) and the frontend inside the container; do not restart a background process that the system stopped for low memory unless asked. Test files inside one spec folder may depend on each other (`013_contracts/004` needs `001`–`003`); specs across folders must not.

## Next session: do this first

1. Check `git log` and `git status`. The 6 Nov work is committed on `fix-tests-followup` (unsigned, see "What the 6 Nov session did"). If the user merged meanwhile, start a new branch from `develop`.
2. Rebuild before running anything if the sources moved: `interfaces`, `common`, `hedera` (!), then every service (`npx tsc -p .` in each), then `npm run guardian:services:down` / `up` from `e2e-tests`. `npm start` runs `dist/`, so a stale `dist` silently runs old code. Start the frontend as in the run recipes.
3. UI `02_policies` has two red specs (6 Nov full UI run: 50 of 52 spec files green): `flow_CDM_0001` (the project form: 58 of 71 answers, then the repeating "Power Unit" entry opens a form of its own; `answerMissingFields` in `userPoliciesPage.js` stops there) and `dryRunMint` (in a dry run the open issue request form closes by itself after the first key typed into it, the viewer re-fetches the block; not understood). `iREC7Split` is skipped on purpose (`pending-issues/split-block-aborts-on-the-second-chunk-cycle-detected.md`).
4. `10_schema_validation` needs the exported `policyForValidation` `.policy` file from the user.
5. `04_contracts/contractImport` passes with a 100 s retry; the delay is tracked in `pending-issues/contract-import-right-after-deployment-fails.md` (a deployment should be usable within seconds).
6. `pending-issues/notification-deletion-test-counts-a-moving-list.md`: passed on a fresh database, cause open.
7. Burn down `pending-issues/eslint-findings-in-the-cypress-suites.md` (67 findings).
8. The frontend specs added on 6 Nov (`profile.service.spec.ts`, `root-profile.component.spec.ts`) are type-checked but were never run: Karma needs Chrome, which the dev container lacks. Run `ng test` where Chrome exists.
9. Keep this file and `PR-DESCRIPTION-7297.md` up to date (both untracked).

## What the 6 Nov session did

Live verification of every pending issue, then fixes, one unsigned commit per coherent change:
- Notes: removed `logs-attribute…` (its test is fixed); updated `contract-import…`, `notification-deletion…`, `set-retire-pool…`, `eslint…`, `gateway-auth-guard…` and `registration-wizard…`; added `split-block-aborts-on-the-second-chunk-cycle-detected.md`.
- Tests: `editToken` (the dialog fills its form after it opens and overwrote the typed name), `deleteArtifact` (own policy: on a fresh seed the first artifact belongs to a published policy), log attribute test (assert the excluded name is absent), `contractImport` (bounded 100 s retry on `INVALID_CONTRACT_ID`, dialog description set in one step), curly braces in two specs.
- Frontend: `ProfileService.pushSetProfile/restoreProfile` time out after 30 s with a toast, `RootProfileComponent.onAsyncCompleted` survives a task body without result.
- Verified live first: of the 15 notes, none was obsolete; the product ones still match the code. Full runs on a freshly seeded database: `api-tests` 829 passing, 1 failing (`deleteArtifact`, now fixed); UI `00`–`09`: 50 of 52 spec files green (`flow_CDM_0001` and `dryRunMint` red; `editPolicyFavorites` was broken by this session's palette change and fixed in `c484567b7`).
- UI `02`, now green: `iREC3`, `iREC3HideDiscButton`, `iREC4`, `iREC5Group`, `GeoJSONandIPFSFieldValidation`, `editPolicy`, `editPolicyValidation`. What was wrong, all test-side: the request form is a sectioned wizard (open the overview section first, fill by field label), submit can replace the form without a banner, the approved state has no badge (the Approve button goes), the waiting screen is `div.pv-state__title`, the policy navigation is the "Workflow" rail (`clickWizardTab`; the CDM approval tabs are the top-level labels VVBs, Project Participants, Projects, Monitoring reports), `wizardSteps` searched only the last member of a selector-group zone, group policies register through a group template, token users icon needs its wrapper, toast close class `p-toast-close-button`.

## What the 5 Nov session did

Commits on `fix-tests-followup` (unsigned):
- `1ab8fb88e` test: skip the specs that need the indexer or the shared remote environment — `017_indexer`, `026_remote_policy`, `028_MGS_analytics_indexer` are `context.skip` with a pointer to `pending-issues/folders-blocked-by-environment.md`. The user agreed that this also removes `026` from the scheduled CI `all` run until an environment exists there.
- `2f954ac68` test: remove the UI page objects no spec imports — `intaller-page.js`, `verra.js`, `projectProponent.js`, `authentication.js`.
- `bbe942284` test: bound every wait in the Cypress suites and wait for real conditions: every wait takes its budget from `support/CustomHelpers/timeouts.js` (`TIMEOUTS.ui` 10 s, `backend` 20 s, `longOperation` 120 s, `POLL_INTERVAL` 200 ms; the user's rule: a Hedera transaction takes a few seconds on the local network, more than 10 s means something is broken); one `pollUntil` in `support/checkingMethods.js` (object signature, reads before it waits, lazy deadline, throws with the last response; `contracts.js` and `CustomHelpers/tasks.js` reuse it); `waitForBlockAvailable` (a policy block answers 503 "Block Unavailable" until the user may act on it, verified in `PolicyComponentsUtils.isAvailableGetData/SetData`); every `cy.wait(<ms>)` replaced by a real signal (tab `aria-selected`, step `.active`, paginator range change, download present, block availability, grid state). The dry-run API flows dropped from minutes to seconds (`027/001_savepointFlow` 2 min 14 s → 11 s).
- `4f06d84e5` test: match suffixed module names and set the contract id in one step (+ `pending-issues/contract-import-right-after-deployment-fails.md`).
- `64c2d251a` docs: track the two count-based API tests that failed in the full run (`logs-attribute-test-breaks-after-four-stack-restarts.md`, `notification-deletion-test-counts-a-moving-list.md`).

Verification of the wait-budget work (all on the live stack, this session): targeted runs of `000_accounts_creating`, `003_ipfs`, `005_profiles`, `011_schemas`, all `013_contracts`, all `016`, all `027`, `009/{tableFieldValidation,customLogicBlockValidation,processFlowiRec3}`, `cdm1`: 222/222 and 62/62. Full run after all the changes: `api-tests` 195/197 specs (843 tests, 25 min; red: `004_logs/getLogsAndAttributes` and `021_notifications/deleteNotifications`, both tracked), `policy-tests` 34/34 (27 min 18 s, against 18 min 31 s in the morning: every CDM spec about 50% slower, iREC unchanged; CDM specs have no fixed waits, so the time is on the stack side, cause not measured — check whether it keeps growing with the database). UI `00`, `01`, the green `02` specs, `03`–`09`: 36/40, the four reds explained below; after the fixes `00` and `05` are green again, `contractImport` is tracked.

UI reds seen while verifying, and what was done:
- `00_account_registration` (2): an active `USER` system schema left by `011_schemas` (known trap below); deactivated in the DB, then green.
- `05_modules/createModule` › "module ipfs import": the seeded module is now published as `ComparedModuleIPFS_<ts>` (name already taken), so the import adds a second suffix; `importedNameMatches` accepts `(_\d+)*`. Green.
- `04_contracts/contractImport`: the contract id field dropped keystrokes (fixed with `invoke('val')`), which uncovered the 500 above. Tracked.

## Where things stand

**Passing on the live stack (6 Nov unless noted):** `policy-tests` 34/34 (5 Nov); `api-tests` all but the skipped folders and `VM033` (829 tests, 1 failure fixed afterwards); `DR-test`; UI `00`–`09` except two `02` specs (50 of 52 spec files). Four of those files run no test: `iREC7Split` is skipped, and `editPolicySaveAs`, `editPolicyUndoRedo` and `editModules` have no active `context`.

**Still open (see `e2e-tests/pending-issues/`):**
- Test side: UI `02_policies/flow_CDM_0001` and `dryRunMint` (no note, see "Next session" item 3); `10_schema_validation` (needs the `.policy` export); `eslint-findings-in-the-cypress-suites` (67 findings); `notification-deletion-test-counts-a-moving-list`; `VM033.cy.js` skipped (both `vm0033-*` notes); `folders-blocked-by-environment`.
- Product: `split-block-aborts-on-the-second-chunk-cycle-detected`, `contract-import-right-after-deployment-fails` (the spec works around it), `system-schema-editor-cannot-create-a-system-schema`, `demo-generate-key-drops-the-calling-user`, `set-retire-pool-fails-on-a-freshly-created-token`, `registration-wizard-stalls-when-the-task-result-is-lost`, `onboarding-leaves-an-orphan-did-when-the-user-update-is-lost`, `gateway-auth-guard-hangs-when-the-auth-service-misses-the-reply` (only the `getUserByToken` and frontend parts are fixed), `dr-restore-needs-a-clean-instance`, `contract-bytecode-must-match-the-service-abi`.

## Traps found in these sessions (do not re-derive)

- **`pkill -f <pattern>` / `pgrep -f <pattern>` | `kill` kills your own shell** when the pattern appears in the command line (exit 144; it happened again this session with `pgrep -f "cypress run"`): collect pids first, then kill specific pids (and their children; a backgrounded `( ... ; ... )` chain starts the next cypress run when you kill the current one).
- **A stale `hedera` package breaks `policy-service`** (`createUnsignedCredential` missing on `VcHelper`): `VcHelper` lives in `hedera/src`, not `common`. Rebuild order: `interfaces`, `common`, `hedera`, services.
- **An active `USER` system schema adds a VC step to the user wizard** (UI `00` then fails waiting for "Confirm"). `011_schemas/putActiveSystemSchema` leaves one active (seen again this session, schema "test"), and the API refuses to delete or deactivate an active schema. Fix: `active: false` on it in `guardian_db.schema` (`{ system: true, active: true, entity: 'USER' }`). Run UI `00` before `011_schemas`, or check this first.
- **The log attribute endpoint caps at 20 values**, and each `guardian:services:up` adds five `WORKER.<id>` names to `logger_db.log`.
- **ESLint pads its columns to the longest message of each file**: diff findings against a baseline only after squeezing spaces. Baseline of a commit: `git archive HEAD e2e-tests/cypress/e2e e2e-tests/cypress/support e2e-tests/eslint.config.mjs e2e-tests/package.json | tar -x -C <dir>`, symlink `node_modules`, run `npx eslint cypress` there.
- **`.should('be.visible', { timeout })` ignores the timeout** (assertion options are not command options): put the timeout on the `cy.get`/`cy.contains` instead.
- **The local gateway serves the API without the `/api/v1` prefix** (`http://127.0.0.1:3002/contracts/import`); the frontend proxy adds it.
- **A boolean `dryRun` in a queued task crash-loops the queue service**: delete it from `queue_db.task_entity` (`{ dryRun: { $type: 'bool' } }`). Symptom: workers stop receiving tasks.
- **UI dialogs drop keystrokes while they re-render**: set the value in one step with `cy.get(sel).invoke('val', v).trigger('input')` and assert it.
- **Row action icons have `pointer-events: none`**: click the wrapper (`div.guardian-icon-button`, `.select-menu-item`).
- **PrimeNG `[label]` and `[formControlName]` bindings leave no DOM attribute**: find buttons by text and inputs by placeholder/id; `p-tab` exposes `aria-selected`, the policy progress steps expose `.active`/`.reach`.
- **Lists filter client-side on the loaded page**; modules and tokens list newest first.
- **Cached GETs go stale after mutations they do not invalidate**; a request with another `pageSize` bypasses the cache.
- **Things the product cannot delete stay behind** (published tokens, modules, schemas; tokens without an admin key; editor-created TAG/SYSTEM schemas).
- **mocha in packages with a `.mocharc.json`** (`api-gateway`, `policy-service`, `worker-service`): add `--no-config --exit`. The frontend `ng test` needs Chrome, which the dev container lacks.
- The `git-lfs` hook warning on commit/checkout is harmless. `git add e2e-tests` stages unrelated edits too: add explicit paths. To commit part of a file, build the staged blob (`git hash-object -w --stdin` + `git update-index --cacheinfo`).

### Run recipes (from `e2e-tests`, inside the dev container)
- The user runs `solo:up` and `guardian:infra:up` on the host; the services run in the dev container with `npm run guardian:services:up` / `guardian:services:down` (gateway `http://127.0.0.1:3002`). The frontend for UI specs: `cd frontend && rm -rf .angular/cache && UI_GATEWAY_ORIGIN=http://127.0.0.1:3002/ npx ng serve --host 127.0.0.1 --port 4200 --proxy-config ./proxy.hostdocker.js` (needs `interfaces` built), then Cypress with `--config baseUrl=http://127.0.0.1:4200`.
- Flags: `--env apiServer=http://127.0.0.1:3002,hederaNet=localnode,minPasswordLength=4,passwordComplexity=easy`.
- Order: `api-tests/000_accounts_creating/*.cy.js` first (users + seed, ~1.5 min), then the rest. Full `api-tests` ~16–25 min, `policy-tests` ~18 min, UI 20–60 s per spec now that waits are bounded. Run long suites in the background with the output in a log file and a completion notification (not `&`).
- Logs: `e2e-tests/.local/logs/<service>-<n>.log`. MongoDB from the container: `mongodb://host.docker.internal:27017` (`guardian_db`, `queue_db`, `logger_db`, `auth_db`).

## Goal (as handed off)

1. Make the four Cypress suites **idempotent**: pass on repeated runs against the same workspace, no setup/cleanup, any order — `policy-tests`, `ui-tests/00` (onboarding), `ui-tests/01` (admin), `ui-tests/02`+`03` (policies/artifacts).
2. Make the **18 CDM e2e policy specs network-agnostic** (any Hedera network) **with zero product changes** — the author's explicit direction. (An early revision of the branch did the opposite — product change + regenerated archives — and was abandoned before the squash; see the History note in `PR-DESCRIPTION.md`.)

**Hard constraint**: all persisted content (code, comments, commit messages, docs) in **English**.

## Final branch shape (`7ffeeb712`, 90 files, +4193/−3221)

| Area | Files | Content |
|---|---|---|
| `e2e-tests` CDM | 18 M + 1 D | 18 network-agnostic specs (19 on develop; cdm6 deleted: its archive never existed in repo history); `cdmTools.js` A; `ApiUrls.js` M (+2 route constants) |
| `e2e-tests` iREC | 14 M | real login, 201-shape assertions, ArrayBuffer decode, plain-file import |
| `e2e-tests` ui | 38 M + 4 A | 26 spec M (00: 2, 01: **0 — already idempotent on develop**, 02: 23, 03: 1); 12 page-object M + `toolsPage.js` A; support helpers `importFlow.js`/`wizardSteps.js`/`pageReadiness.js` A; `verraPolicy` reduced to a viewport+visit skeleton; `GuardianUrls.js` M (+3 keys) |
| `e2e-tests` docs/tooling | README M, `.gitignore` M (+`cypress/downloads/`), 5 pending-issues A, `cdm1Sample.record` A | UI-suite patterns section; one doc per product issue found |
| Repo root | 3 | `package.json` M (workspace lint script) + `utils/lint-all.sh` A + `frontend/proxy.hostdocker.js` A (dev-server config for in-container UI runs) |

**Zero product files** — `git diff origin/develop 7ffeeb712 -- common/ guardian-service/ "Methodology Library/"` is empty. 13 A / 1 D / 76 M. (`frontend/package.json` is NOT in the PR; the in-PR `package.json` is the root one.)

## CDM remap technique (the network-agnostic core, final)

**Why a remap is mandatory on every network, not only non-testnet** (product code facts; keep this rationale if the technique is revisited):
- The 17 tool-bearing CDM archives (the 18th, AR-ACM0003, references 0 tools) embed **testnet** messageIds. On testnet the import resolves them natively.
- On any other network (`localnode`, `previewnet`, `mainnet`) the tool resolver is the import `metadata`: a reference is accepted **only** when remapped (`resolveToolOverrides` requires `metadata.tools` entries; without them `MESSAGE_NOT_FOUND`; `toolOverride` falls back to the raw ref only if it happens to resolve).
- A local re-import of a `Tools/` zip mints a **new** messageId (the id = the minted consensus message id; the content hash is not part of identity) — so the archive's refs never match the local copies even though the tool content is identical. Remap is the only path.
- The metadata is built from the archive's own reference list: `TOOL_REFS` maps each referenced tool → **that tool's own archive's** source messageId (one archive references "Tool 33" under an older testnet export than the others — the remap target is the same local tool either way). The source messageIds are rewrite keys, never resolved against the network.

**Per spec**: `it`s return their chain; `prepareTools(TOOL_IMPORT_ORDER, authorization)` runs the tools in dependency-first order (per tool: import `file-metadata` → assert publish `isValid` → record published mid → import policy `file-metadata`), then asserts the imported row by name pattern (accepting the `_d` suffix on re-import) and `tools.length` (== the archive's `policy.json.tools` raw array length — five archives list "Tool 03" twice, so ACM0018 = 13).

**`cdm1`** is the only full-flow pilot (3 `it`s): import (tools prep chained inside the same `it` — the local identity map does not survive across `it`s) → upload the saved sample record (`cdm1Sample.record` fixture, 394 B; the original archive carries no `tests/` dir) → dry-run if needed → start → `whilePolicyTestExecuting` poll → assert `tests[0].status === 'Success'` and `result.total === 100`.

**`cdmTools.js` (support helper)**: `TOOL_SUB_REFS` (each tool's nested-reference messageIds from the committed `Tools/*.tool` files — stable), `metadataPart` (JSON parts as Blob — Chromium `FormData` rejects string parts with a filename; binary parts come from the library zips), `decodeBody` (**body-first** — see the cross-realm trap), `parseImportResponse` (decodes + parses the policy list, locates the imported row by `namePattern`, not list position), `requestWithRetry` (3 attempts, 3 s backoff, on 500 only; every helper request uses it; then fails with the decoded error body), `importAndPublishTool` (import `file-metadata` → assert publish `isValid: true` → record the published messageId in the caller's local map), `prepareTools` (runs `importAndPublishTool` per tool in the caller-given dependency-first order, **seeded with `cy.then` — never a real `Promise`** — see Root cause), and `importPolicyArchive`/`importPolicyFile` (the policy import with or without remap).

## Idempotency changes (policy-tests, ui 00/01/02/03)

- **14 iREC specs**: real login (`Authorization.getAccessToken`, was the `Cypress.env('authorization')` env token), fixture paths fixed to the renamed iREC library directory (the `develop` specs still read the pre-rename path, which no longer exists), plain-file import instead of the demo route, 201 shape asserted (import returns the full policy list, newest first — just-imported policy is first entry; suffixed name on re-import accepted), `ArrayBuffer` body decoded. **Caveat: their `it` bodies still don't `return` the chain** — the same latent pattern the CDM specs had. Passed the double-green suite runs (single-part zips, short uploads); a one-line `return` follow-up is the hardening.
- **00**: per-run names, register-response wait, settled login phase (duplicate and auto-logged-in outcomes both accepted).
- **01**: no spec changes — the administration specs were already idempotent on `develop` (a previous PR merged in August). Its work in this PR is in the page objects it uses (`settings.js`, `status.js`, `logs.js`): `cy.visit`-based navigation + `waitForPageReady` instead of navbar clicks, PrimeNG-era locators. Verified with the double green on the populated workspace.
- **02/03**: `onBeforeLoad` clean boot, `ensureAccount()` self-service onboarding with a **settled-phase poll** (the gateway's auth guard can hang when the auth service misses its reply — `pending-issues/gateway-auth-guard-hangs…`), `importFlow.js` (`dropFile` via `DataTransfer` — the UI drag-and-drop path; `waitForTaskRoundtrip`; `settleToolRowChecks`; `replaceInaccessibleTools`), `toolsPage.ensureToolPublished` (publishes tools the current user cannot access), `wizardSteps`, `pageReadiness`, `logOut()` for the `@if`-gated header, per-run policy names.
- The page objects adapt to the redesigned policy-viewer DOM that landed on develop (buttons as `<button class="btn-*">`, the registration **Continue** button, dual-mode role picker, content-area request-document form) plus develop's subsequent form-redesign page-object updates folded in by the squash rebase.

## Verification

**Live (the CDM remap work — the one not covered by idempotency runs)**: 18/18 specs, 20 tests, 0 failing (cdm1 = 3 tests, the other 17 = 1 each) on the user's `hedera solo` localnode stack (gateway `http://host.docker.internal:3002`) against the **unmodified develop product** — `npx cypress run --e2e --spec "cypress/e2e/policy-tests/cdm/*.cy.js"` from `e2e-tests`, solo login `StandardRegistry`/`TestPass1`. Per-spec 5 s–101 s. HBAR SR 99,933.21 → 99,871.24 ℏ.

**Idempotency**: two consecutive full green runs per suite before the squash (`policy-tests` — including the 14 iREC — `00`, `01` ✅; `02`/`03` not double-greened — workspace precondition, see below).

**Static**: `node --check` + ESLint zero findings on branch lines; validator (cross-checks every constant against the actual archives + `Tools/` files): all pass; `guardian-service` unit suite on the develop baseline: 2628/0.

**Outstanding (workspace, not PR)**: the 02 double green needs a DID-bearing user — the workspace was reset to a fresh seed and every 02 view is DID-gated until at least the SR is onboarded (the `onboarding-leaves-an-orphan-did…` product bug docs remain open).

## Root cause of the original 17/18 live failures (keep the evidence chain)

1. **Real symptom**: 17/18 import specs failed live with `Invalid defs` or `MESSAGE_NOT_FOUND` (the resolver's signatures) after a 307 ms request; the 18th (cdmAR3, no remap) passed.
2. **The empty body was a phantom**: no request ever reached the gateway with an empty body — the service-side decode path (`cy.request` delivers binary bodies as cross-realm `ArrayBuffer`s; `res.body` is a *different-realm* `ArrayBuffer`, so an `instanceof ArrayBuffer` check is realm-false) is **correct**; a 405→415→201 A/B matrix + a body-size matrix (curl can't send the `ArrayBuffer` form — no `fetch`/`Buffer` in the automation sandbox) proved the empty-body 500 was an artifact. *Trap: cross-realm objects — always duck-type on `byteLength`.*
3. **Stack saturation is real but minor**: solo nodes 1–6 all ~100/100 stacks (500 stack / 500 limit, no auto-restart) while serving the suite; a bounded 500 retry (`requestWithRetry`, 3 attempts with 3 s backoff) makes the specs robust against it; `Invalid defs` is not a saturation signature.
4. **The real defects (test-side)**: (a) `prepareTools` seeded its sequence with a real `Promise.resolve()` — a real Promise adopts a returned Cypress chain by settling it from the chain's *current* tail, while the `cy.request` tasks are enqueued lazily from later callbacks (after the settle point) → early resolution with an empty name→messageId map → orphaned requests; (b) spec `it` bodies didn't `return` the chain → mocha completed in <1 s → the in-flight multipart uploads raced the next spec's browser teardown → **truncated bodies**: a truncated multipart loses the trailing `metadata` part (the resolver then falls back to the archive's testnet messageId → `MESSAGE_NOT_FOUND`) / a truncated zip loses schema entries (`Invalid defs`).
5. **Proof**: a throwaway probe spec showed 307 ms / 201 with the chain returned (the real fix) vs 12 s / 500 `MESSAGE_NOT_FOUND` with the old empty-body path; then the canary (cdm1+cdm2) was green, then the **full 18-spec glob 18/18**. `zz-debug.cy.js` deleted afterward; everything is in the final `cdmTools.js` + specs.
6. **Corollary baked into the helper**: binary request responses are decoded body-first (the ArrayBuffer *is* the body for non-JSON content-types), never by `typeof` of a possibly-null/number body.

## Known remaining (documented in `PR-DESCRIPTION.md`; do not silently fix in a future session without the author)

- **14 iREC specs**: `it` bodies un-returned (latent race; passed double-green runs; single-part zips).
- **`authorization.js`**: the inner token `cy.request` still doesn't `return` (works via the queue-insertion semantics; out of scope for this PR's audit bar).
- **02 double green** pending a DID-bearing user in the workspace.
- Legacy lint debt in touched files (~11k across the tree; 30 in this PR's files — `homePage.js` 16, `checkingMethods.js` 13, `userPoliciesPage.js` 1).

## Dead ends / traps (do not re-derive)

- `grepTags=policyAT` is **not** the CDM-only selector (it pulls in the 14 iREC specs — tag naming is per-suite, shared values are not a scope). Use the `--spec` glob.
- When a request **sends** a binary body (Blob), `cy.request` returns the response body as a cross-realm **`ArrayBuffer` even for JSON content-types** — `instanceof ArrayBuffer` is realm-false and `typeof` says `object` for both; `decodeBody` (duck-typed on `byteLength`) is the only safe decode. (`cy.log` of a `Blob` prints empty; surface data via deliberate `cy.fail` messages or the mochawesome `.jsons`.)
- A failed `it` **aborts the remaining `its`** of the spec — probe one spec at a time.
- `hedera solo` v0.57 has **no** `--account-balance` flag (the docs in `hedera-dev` repo are ahead of the binary); set balances in the gateway UI (token `0.0.0.0.1120`), or rely on the ~100 ℏ allocation (≈9,111 imports — effectively unbounded for tests).
- `Cypress.on('fail', …)` handlers must be **idempotent + guarded** (retries fire them multiple times); `cy.writeFile` inside a fail handler throws in the sandbox context — use `saveFailState`.
- The gateway routes to the auth service **hang** (not reject) when the auth service is busy/unhealthy — never let a spec call auth without the settled-phase poll.
- `/tools/` returns 100 of 158 (DB growth is monotonic — a passing run on a superset state stays valid); `/schemas/` 1000 of 2165; `page` is ignored by the base routes, `pageIndex`/`pageSize` honored by another handler.
- **LFS + container git**: `git diff` against the LFS-tracked `Methodology Library/` dirs **hangs forever** in the dev container (no LFS smudge); scope pathspecs to `common/`/`guardian-service/`/`e2e-tests/`.
- The dev container has no `gpg` — commit/push/force-push is the user's action.
- `host.docker.internal` is required for every network touch from the container (`apiServer`, `baseUrl`).

## Environment

- **Repo**: `hashgraph/guardian` — branch `fix-tests` = the squash; `origin/develop` tip `ccf04d588`.
- **Stack**: `hedera solo` v0.57 (localnode + guardian gateway), `e2e-tests/.solo`; gateway `http://host.docker.internal:3002`; SR `StandardRegistry`/`TestPass1`; `Cypress 15.15.0` (no `@cypress/request` — v14+ removed it); `node 22`.
- **Run**: `cd e2e-tests && npx cypress run --e2e --spec "cypress/e2e/policy-tests/cdm/*.cy.js" --env apiServer=http://host.docker.internal:3002`.
- **Session docs (untracked, repo root)**: `PR-DESCRIPTION.md`, `SESSION-NOTES.md`. **In the PR**: `e2e-tests/README.md` (UI-suite patterns), `e2e-tests/pending-issues/*.md` (5 new product-issue docs).
- **Throwaway analysis (re-runnable, in `/tmp/opencode`)**: `gen-cdm-specs.py` (generator — re-runnable with the 2026-11-03 `Methodology Library` layout), `validate-cdm-specs.py` (validator — ground-truth cross-check), `curl-canary.sh` (curl A/B matrix), `full-run.log` / `canary3.log` / `ab*.log` (verification run logs).

## Generator / validator notes

- `gen-cdm-specs.py` emits the final spec form (awaited `it`s, remap, importFlow helper, 3 `it`s for cdm1). Re-run it **from a clean checkout of the squashed branch** if regenerating — it now matches the committed output.
- `validate-cdm-specs.py` cross-checks every spec constant (per-archive reference messageIds, name regexes incl. the renamed variant, tool counts, nested-reference sets in both directions, topological order) against the actual files on disk. Run `python3 /tmp/opencode/validate-cdm-specs.py` from `e2e-tests/`.
