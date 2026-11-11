# Plan — triage of the pending issues and the work in progress, and the order to resolve them

**Status (11 Nov 2026):** triage done. Every note in `pending-issues/` and both plans in `work-in-progress/` were checked against the code on branch `fixing-pending-issues` (HEAD `485181eca`, clean tree, after the `develop` merge) and, where a live check was possible, against a fresh stack (Solo 0.97.0, infra on the host, services and `ng serve` in the dev container, all packages rebuilt). Nothing in the repository was changed by the triage, apart from this file. The run logs are in `e2e-tests/.local/verify-1111-*.log` (git-ignored). The user's decisions are recorded in §5 and folded into the steps of §4 (Steps 0–6 in scope, Step 7 left for later); Steps 0–2 are done (see §3.1, §3.2).

> **Agent executing this plan: read §7 before starting any step.** Each step has an assigned model and effort level. If yours do not match the step you are about to start, do not start it: stop and ask the user to switch (`/model`, `/effort`).

## 1. How each item was verified

- **Static:** the code paths each note cites, read at HEAD, plus `git log` on those paths since the note's date.
- **Live:** `000_accounts_creating` on the empty database first (12/12), then the specs or API probes listed per note below. The three specs that are `context.skip` were run from throwaway unskipped copies (`zz_verify_*.cy.js`), deleted after the run.

## 2. Verdict per note

| Note | Verdict | Evidence (11 Nov 2026) |
|---|---|---|
| `split-block-aborts-on-the-second-chunk-cycle-detected` | **Open, reproduced** | `iREC7Split` (unskipped): `Balance for Registrant never reached 2 in 120000 ms (last seen: 1)`; policy-service log `Cycle detected: target "save_chanks" was already used`. Code unchanged (`split-block.ts:287-297`, `record-action-step.ts:89-100`). |
| `vm0033-archives-cannot-be-published-field-key-with-a-dot` | **Open, reproduced** | `VM033` (unskipped): `PUT /policies/{id}/publish` 500, `Field key "3.1.3.5_buffer_zones" … contains reserved character "."`. Key still in the fixture and in the library archive (8 occurrences each). |
| `vm0033-project-creation-stalls-in-the-step-chain` | **Open** (blocked behind the dotted key) | Not reachable live without editing the fixture. Static: `custom-logic-block.ts` changed in the merge (`2a4fbaf66`, table outputs) but the rewind on validation error (`:177-178`, `:211`) and `step-block.ts:268` are unchanged. "Re-verified (31 Oct)" section is superseded by the note's own 5 Nov root cause. |
| `request-form-closes-when-a-pushed-block-update-arrives` | **Open, reproduced** | `dryRunMint` (unskipped, 2/2): `Expected to find element: request-document-form .form-field, but never found it`; the request trace shows the hosting blocks re-fetched 3.1 s after the approval (§2.1). Code unchanged (`policy-components-utils.ts:233` 2000 ms batch, `request-document-block.component.ts:131-136`). |
| `system-schema-editor-cannot-create-a-system-schema` | **Open, reproduced, worse than noted** | API probe of the editor's real save path (`POST /schemas/:topicId`, `category: SYSTEM`, it never calls `POST /schemas/system/:username`): stored as `category=SYSTEM, system=false`, entity `NONE`/`VC`; the System list stays at 18. **New:** such a draft cannot be deleted: `DELETE /schemas/:id` → `403 Invalid schema category.`, `DELETE /schemas/system/:id` → `403 Schema is not system.` |
| `registration-wizard-stalls-when-the-task-result-is-lost` | **Open, reproduced** (onboarding round trip) | `flow_CDM_0001` on the fresh database: `expected '/user-profile' to include '/task'` in `_runUserOnboarding` (`homePage.js:561`); `User2` ended fully onboarded server-side (DID, parent, account set). Same as run C of the handover. Static: mechanism 5 (unguarded destructure) is **fixed** (`root-profile.component.ts:519-523`); mechanisms 1, 2, 4 and the missing polling fallback are open; mechanism 3's "the rebind resolves `null` for a rejected token" is **wrong** (`websockets.ts:500`: a rejection throws before the assignment, `ws.user` keeps its old value). |
| `gateway-auth-guard-hangs-when-the-auth-service-misses-the-reply` | **Partly fixed, note partly wrong** | Open: every `Users` lookup but `getUserByToken` is a plain `sendMessage` (`users.ts:192` `generateNewAccessToken`); `AuthInterceptor` `refresh$` has no timeout (`auth.service.ts:251-253`); `AuthStateService` 29 s interval with no error handler. Fixed: profile push/restore 30 s timeout. **Wrong:** "the `GENERATE_NEW_ACCESS_TOKEN` handler produces no reply at all" — `NatsService.getMessages` replies with a 500 on any throw since `12b48fe7d` (8 Sep); live, the `JsonWebTokenError: jwt malformed` lines in `auth-service-1.log` come from that catch (`nats-service.js:399`). Not reproducible on demand (transient). |
| `onboarding-leaves-an-orphan-did-when-the-user-update-is-lost` | **Open** (static), not reproduced | `common/src/helpers/users.ts:152-153` `UPDATE_USER` plain `sendMessage`; no compensation (`profile.service.ts:153-165`); the wizard never resumes an existing DID (`user-profile.component.ts:523`). Detail to fix: `confirmed`/`failed` are derived in `guardian-service/src/api/profile.service.ts:530-531`, not in the component. |
| `demo-generate-key-drops-the-calling-user` | **Open** (static, conclusive) | `guardian-service/src/api/demo.service.ts:95-100,113-117` still pass `null`; gateway still sends `userId`. |
| `contract-bytecode-must-match-the-service-abi` | **Second defect open** (static) | `contract.service.ts:524-535`, `:867-875` loops without per-contract try/catch; `getContractVersion` `:1375-1392` still falls back to `'1.0.0'`. Config file ids match. Live: no `no matching event` on the fresh database (no legacy contract to trigger it). |
| `set-retire-pool-fails-on-a-freshly-created-token` | **Symptom not reproduced; latent ordering still in code** | Probe (as `006_setPools`, fresh wipe-bound token, pool set immediately): 2/2 accepted on the first attempt, ~2 s. `013_contracts` green (14 specs, 149 tests). The handler still calls `setPoolContract` before the mirror-node read (`contract.service.ts:3274` → `:3285`), so a lagging mirror node would still produce the partial success. |
| `contract-import-right-after-deployment-fails` | **Symptom not reproduced** | Probe: 3/3 imports as `Verra` accepted on the first attempt, 0.8 s after the deployment; `contractImport` UI spec green. Likely changed by the Solo upgrade (`5a4ed1fcc`, 0.97.0); the retry in `contractsPage.js:38-39` has not been removed yet, so the spec does not prove it alone. |
| `notification-deletion-test-counts-a-moving-list` | **Open, not reproduced** | `021_notifications` green on the used database; the assertion on the total is unchanged (`deleteNotifications.cy.js:74`). |
| `folders-blocked-by-environment` | **Open, one stale reference** | 9/9 specs `context.skip`; nothing on `:59123`; `ApiMGS` hardcoded (`ApiUrls.js:17`); 028 not in `specPattern`. Stale: the MGS secrets are injected in `e2e-run.yml:480-481` (called by `e2e-tests.yml`), and the scheduled scope is `api-all policy-all`, not `all`. |
| `policy-autotests-need-a-recorded-flow-per-policy` | **Open** (static) | Only `iRec2.cy.js` replays a real record; `cdm1Sample.record` still holds only `START`. |
| `tests-not-run-by-any-workflow` | **Open, incomplete** | No workflow runs `ng test`, `indexer-*` tests, `test:scripts`, `report-test-summary.test.mjs` or `eslint cypress`. Measured: `npm run test:scripts` 14/14 pass, `report-test-summary.test.mjs` 11/11 pass. Missing from the note: the 10 `indexer-frontend` specs (Angular 17, Karma), which no workflow runs either. Frontend specs not run (no Chrome in the container). |
| `eslint-findings-in-the-cypress-suites` | **Open, stale counts** | 19 findings, not 67: 15 `no-unused-vars` (`customLogicBlockValidation` ×4, `homePage` ×3, `userPoliciesPage` ×2, `editModules` ×2, `getSession`, `002_getPolicyTestResult`, `00_remotePolicyUserPreparing`, `deleteModule`), 2 `max-len` (011 system-schema specs), 2 `cypress/no-assigning-return-values` (`policySchemaPage`). `eqeqeq`, `no-useless-escape`, `no-dupe-keys`, `no-dupe-class-members` are at zero. |

### 2.1 Second run of `dryRunMint` and `flow_CDM_0001`

Both were re-run with the dev-server request trace on (`UI_PROXY_LOG=true`, `.local/ng-serve-proxy-1111b.log`).

- **`dryRunMint` (2/2 failed the same way):** the trace matches the note's mechanism. The approval `POST …/sync-events` at 17:54:33.66, the switch to the Registrant (`dry-run/login`) at 34.11, the Registrant's view loads `tag/create_issue_request_form/blocks` and `tag/revoke_issue_device_btn/blocks` at 35.18, and the same two are fetched **again** at 36.79 (3.1 s after the approval, the 2000 ms `BlockUpdateFn` batch plus latency); the form field is then never found.
- **`flow_CDM_0001`, second run:** onboarding passed (the account was already complete, as the handover predicts), the flow ran 14 min and failed on a wizard step click covered by the `div.loading` overlay (`wizardSteps.js:144`, logged in as `User2`). In the last 30 s the workspace re-initialized every 5–7 s (`GET /accounts/session` bursts at 18:07:40, :46, :53, :57, 18:08:02, :08; no 401, no WS upgrade, one 503 on `tag/add_report_bnt/blocks`) against a 10 s click budget. This is the "late wizard race" of the handover's run I, which the handover left as "a candidate for its own issue if it recurs". It recurred, and **there is no note for it yet** — see Step 5.

## 3. Work in progress — still a valid starting point?

`plan-downstream-e2e-handover.md` is the one to resume from; `plan-fix-4-ui-spec-failures.md` is superseded by it (its open items are the same ones, its CDM tools-grid item landed in `cc735aeb9`, its §5 "no note is deleted" was overtaken by `da4db1faa`, and its §4.5 skip count adds up to 22, not 23).

What is left, de-duplicated:

1. **Commit 3** (`policiesPage` import gate 4 → 6 attempts, `policiesPage.js:317-324`): not done. `iREC5Group` passed with the current 4 attempts on the healthy stack (7 min). The 10 Nov failure belonged to the gateway no-reply class, so widening the budget buys time against a product gap. **Dropped** (decision 1): remove it from the handover's "What is deferred"; if the full run fails there again, it is evidence for Step 5, not a reason to widen the budget.
2. **Pass 2** (re-run `011_schemas`, then the four wizard specs twice): still to do. The `00_account_registration` specs passed today (15/15 tests, without the 011 schema present).
3. **Full `all` run** (~1 h 17): still to do. Expect `flow_CDM_0001` to fail: on a fresh database at the onboarding round trip (reproduced today), and on a used one possibly at the late re-init race (also reproduced today, §2.1), until Step 5 is done. The handover's "green ×2" (runs K/L) was on a workspace already full of policies, tools and tokens; today's two runs on a fresh stack went 0/2.
4. The 9 product follow-ups of the handover map onto Steps 4 and 5 below.

Once 2–3 are done the two WIP files can be deleted; their product follow-ups live on in the notes and in this plan.

### 3.1 Outcome of Step 1 (11 Nov 2026)

- Full `all` run (`.local/baseline-all-1111.log`, 2 h 24): 2 of 276 specs failed (1027 tests, 1002 passed, 23 skipped): `deleteNotifications` (`expected 58 to deeply equal 56`, Step 2) and `iREC5Group` (click covered by `div.loading`). `flow_CDM_0001` passed (15:54).
- Pass 2 (twice each): `00_account_registration` 2/2 (15/15 tests each time); `flow_CDM_0001` 0/2 (overlay click, then `assignReport` option not found); `iREC5Group` 1/2 (overlay click). The UI flows are intermittent on the re-init loop, which Step 5 item 4 addresses; the evidence is in `pending-issues/frontend-workspace-reinitializes-every-few-seconds.md`.
- The two WIP files were deleted.

### 3.2 Outcome of Step 2 (11 Nov 2026)

- `contract-import`: the retry in `ContractsPage.importContract` is removed; `contractImport.cy.js` 2/2 green; note deleted.
- `notification-deletion`: the test asserts on the ids it deleted and kept instead of the total; `021_notifications` 2/2 green (21 tests each); note deleted.
- `set-retire-pool`: the retry removal could not be verified. `013_contracts` fails on the unmodified code too (2 of 14, three runs plus a control), because of a new defect: `links.next` is followed without the mirror port, and `Registrant` now holds more than 100 NFTs (`pending-issues/mirror-node-pagination-drops-the-port.md`). The pool call was accepted at once in two of three trial runs and timed out after 20 s in one, so the retry stays and the note records the trial. Repeat it after the pagination fix (suggested in Step 4).

## 4. Resolution order, grouped by theme

The order puts first what unblocks the rest: correct notes, a green baseline, the ability to unit-test the frontend, then the defect clusters, then what needs a product decision.

### Step 0 — Refresh the notes (test-side docs only, no code)

Rewrite the stale parts listed in §2: ESLint counts; folders-blocked workflow references; auth-guard "no reply at all" paragraph, its "Suggested fix" bullet 2 and "Where it comes from" item 3; registration-wizard mechanism 3 and 5 and variant 3, plus the 11 Nov reproduction; orphan-DID location detail; system-schema editor path and the undeletable drafts; tests-not-run (`indexer-frontend`, measured passes); VM0033 stall (drop the superseded sections); set-retire-pool and contract-import (not reproduced on Solo 0.97.0). Write the new note for the workspace re-init loop with the §2.1 evidence. One commit.

Environment cleanup (decision 5, no commit): delete the two probe drafts from `guardian_db.schema` by id (`6af4ab5777b4dac5140e68bd`, `6af4ab5977b4dac5140e68c7`, names `editorProbe1794419543643NONE`/`VC`), then check that `GET /schemas?category=SYSTEM` no longer lists them.

### Step 1 — Close the work in progress (e2e-tests only)

Commit 3 is dropped (decision 1). Pass 2 and the full `all` run (WIP items 2–3 of §3) give the baseline for everything below; the `all` run covers pass 2's first half, because the API suite (with `011_schemas`) runs before the UI suite. Then delete the two WIP files.

### Step 2 — Retire what no longer reproduces (e2e-tests only, approved: decision 3)

- `contract-import`: remove the retry in `ContractsPage.importContract`, run `contractImport.cy.js` twice. Green twice → delete the note.
- `set-retire-pool`: the symptom is gone but the ordering is not; remove the retry in `Contracts.setRetirePool`, run `013_contracts` twice. If green, re-scope the note to the latent ordering, fixed in Step 4.4.
- `notification-deletion`: assert on the deleted ids instead of the total, then delete the note.

### Step 3 — Test tooling and CI (approved: decision 2)

**3a. Karma vs Cypress for the Angular unit specs.** Facts gathered: 117 `*.spec.ts` (107 in `frontend`, Angular 21.2, Karma 6.4.4 + Jasmine 5.13 through `@angular/build:karma`; 10 in `indexer-frontend`, Angular 17.3, `@angular-devkit/build-angular:karma`). Karma is deprecated (its own README). `@angular/build` 21 ships a `unit-test` builder whose `runner` is `vitest` by default; without `browsers` it runs in Node with jsdom, so it needs no Chrome and would run in the dev container. `@schematics/angular` has a `refactor-jasmine-vitest` migration. Cypress 15 also does component testing, but that would mean rewriting the specs. Recommendation to evaluate: keep Cypress for e2e only, and move the unit specs from Karma to the `unit-test` builder with Vitest. The new dev dependencies (`vitest`, `jsdom`) and the builder change are approved for the evaluation; the outcome (migrate or stay on Karma headless) is reported back before it becomes the default.

Steps:
1. Get the current state of the 107 frontend specs as they are. The dev container has no Chrome, so either run `ng test --watch=false --browsers=ChromeHeadless` where Chrome exists (host or CI runner), or take the Vitest run of step 2 as the first measurement and say so.
2. Run `refactor-jasmine-vitest` and switch the `test` target to `@angular/build:unit-test`; run the specs in jsdom; list what fails and why (a migration artefact vs. a real failure vs. a spec that needs a real browser).
3. Decide with that list; then do the same for `indexer-frontend` (Angular 17, and its `package.json` does not depend on `@angular/build`, where the `unit-test` builder lives: it stays on Karma headless or is upgraded — to be decided with its own list).

**3b. Include the tests the suite does not run.** One documented entry point in `e2e-tests` (an npm script, described in its README) that runs everything locally: the Cypress suites, `test:scripts`, `report-test-summary.test.mjs`, the frontend unit specs, and `npx eslint cypress`.

**3c. Run them in CI.** Add to `main.yml` (component tests): the frontend unit specs (headless or jsdom, per 3a), `indexer-service` tests (+ build), `npm run test:scripts`, `node --test .github/scripts/report-test-summary.test.mjs`, and `npx eslint cypress` once the 19 findings are fixed. The workflow change can only be verified by a CI run on GitHub, which needs `gh` or a push: ask before either. Then delete `tests-not-run-by-any-workflow.md` and, after the burn-down, the ESLint note.

**3d. ESLint burn-down** (19 findings, mechanical, mostly unused variables) — prerequisite of the ESLint CI step.

### Step 4 — Small, well-scoped product defects (in scope: decision 4; each with a failing unit test first)

In order of confidence and size:

1. `split-block` — reproduced; key the cycle check on the document as well as the target (or exempt a block's own fan-out); policy-service unit test with a split of at least two chunks; then un-skip `iREC7Split` and delete the note.
2. `demo-generate-key` — pass `userId` through both `demo.service.ts` handlers; guardian-service unit test; assert the round trip in `001_demo` if observable.
3. `contract-bytecode` second defect — per-contract try/catch in `syncWipeContracts`/`syncRetireContracts`, and make `getContractVersion` report an unknown version instead of `'1.0.0'`; guardian-service unit tests.
4. `set-retire-pool` latent ordering — resolve the token before the contract call, so a mirror-node miss fails before anything changes on-chain; guardian-service unit test with a stubbed `GET_TOKEN_INFO` failure asserting the contract is not called. Then delete the note.
5. **Proposed, not yet approved (added 11 Nov, outside decision 4):** `mirror-node-pagination-drops-the-port` — resolve `links.next` against the request URL at the three places in `hedera-sdk-helper.ts`; worker-service unit test with a two-page mirror on a non-default port; then re-run `013_contracts` twice, repeat the `setRetirePool` retry removal of Step 2, and delete the note. Until then `013_contracts` fails on a workspace where an account holds more than 100 NFTs.

### Step 5 — Reliability cluster: lost replies and lost task results (in scope: decision 4; frontend + gateway + common)

The same failure class behind the remaining UI flakiness and most test-side recoveries in the page objects (`pageReadiness.js`, `homePage.login`, `waitForTaskRoundtripWithRecovery`). Frontend fixes need Step 3a for their unit tests.

1. Task-result delivery (`registration-wizard-stalls`): polling fallback in `AsyncProgressComponent` / the `/task/:id` page while the one-shot `get()` finds no result; `ngOnChanges` keyed on `inputTaskId`; a toast in `root-profile.randomKey()`'s error path. This is what fails `flow_CDM_0001` on a fresh database.
2. Bounded NATS waits (`gateway-auth-guard`): `sendMessageWithTimeout` for `generateNewAccessToken` and the other `Users` lookups behind guards (gateway and `common/src/helpers/users.ts`); `timeout` + error path on the interceptor's shared `refresh$`; error handler on `AuthStateService`'s refresh.
3. Orphan DID (`onboarding-leaves-an-orphan-did`): bounded `UPDATE_USER`, mark the DID `FAILED` (or roll back) when the user update fails, and let the wizard re-link an existing `CREATE` DID.
4. **New note first:** the repeated workspace re-initialization (every 5–7 s, see §2.1) whose `div.loading` overlay starves wizard clicks in `flow_CDM_0001`. Pin the trigger (the handover's follow-up 1 lists the candidates: the gateway WS rebind after the token is set, an HMR socket), write the note, then fix.
5. Handover follow-ups that belong here: the tokenless-document redirect (`PermissionsGuard`), the `profiles/null` demo-card boot path, the 29 s vs 30 s refresh margin.

After each fix, remove the matching test-side recovery and run the affected UI specs twice.

### Step 6 — Defects whose fix involves a design choice (in scope: decision 4)

Each starts by reading the code path and choosing between the options below; the choice and its reason go in the commit message.

- `request-form-closes` — preferred: the policy viewer keeps an open form when it reloads a block with the same id (frontend, unit test on `RequestDocumentBlockComponent` / the viewer reload path); fallback: `BlockUpdateFn` does not push an update for blocks whose data did not change (policy-service, unit test). Then un-skip `dryRunMint`, run it twice, delete the note.
- `system-schema-editor` — the System tab of the editor offers the two entities the API accepts (`STANDARD_REGISTRY`, `USER`) and saves through `POST /schemas/system/:username`, so what it creates is a real system schema; plus a way to delete the `category=SYSTEM, system=false` drafts the current editor has already created (the generic delete route accepting them, or a migration). Frontend unit test + the skipped `it.skip('create system schema')` in `createSystemSchema.cy.js` written and enabled. Then delete the note.
- VM0033 (both notes) — fix the content of the library archive `Methodology Library/Verra/Verified Carbon Standard (VCS)/VM0033/VM0033.policy` and of the fixture `VM0033_7_23.policy` (not LFS-tracked: `git check-attr` reports no filter): rename `3.1.3.5_buffer_zones` (e.g. `3_1_3_5_buffer_zones`) in the two schemas of each, and make the `calculate_project_fields` custom-logic script assign each conditional field only when its flag is `true`. Edit the JSON entries textually, never by re-serializing them, and keep the rest of each zip byte-identical. Whether policies already published with the dotted key need a migration is noted in the commit, not solved here. Then un-skip `VM033`, run it twice, remove the dead `ipfsAddFixture` task, delete both notes.

### Step 7 — Coverage and environment (out of scope for this branch: decision 6; the two notes stay open for later)

- `policy-autotests` — record a real flow per policy, starting with `cdm1` (measure a CDM replay first).
- `folders-blocked` — an indexer in the local stack (`017`), an `apiMGS` origin override and credentials (`026`, `028`).

## 5. Decisions (user, 11 Nov 2026)

1. Commit 3 (iREC5 import gate): **dropped**.
2. Step 3: **approved** — evaluating Vitest (new dev dependencies) and adding the CI steps.
3. Step 2: **approved** — changing `deleteNotifications.cy.js`'s assertion and removing the two retries in the contract helpers.
4. Steps 4–6: **all in scope** for this branch.
5. The two `editorProbe…` drafts: **approved** — delete them from Mongo by id (Step 0).
6. Step 7: **left open for later** — not part of this branch; `policy-autotests-need-a-recorded-flow-per-policy.md` and `folders-blocked-by-environment.md` stay in `pending-issues/` (the latter still gets its Step 0 refresh).

## 6. How the steps are executed

- One step (or one item of Steps 4–6) at a time; each ends with its tests, `npx eslint cypress` for e2e changes, the package's linter for product changes, and a commit with only its paths, `.local/pr-description.md` updated each time.
- Product changes: failing unit test first, then the fix (AGENTS.md); rebuild the touched packages and restart the services before any e2e run; never rebuild while a long Cypress run is in progress (it would change the `dist/` files under the running services).
- An e2e spec that is un-skipped or whose workaround is removed runs twice; a note is deleted only when nothing in it is left.
- The full `all` run is repeated at the end, after Step 6, as the final check.

## 7. Model and effort per step

The plan is run with the cheapest model and effort that fit each step: Claude Sonnet 5.5 where the work is mechanical or fully specified here, Claude Opus 5.5 where it is diagnosis of races and flakiness or a design choice, since a wrong lead there costs long e2e runs.

| Step | Model | Effort |
|---|---|---|
| 0 — refresh the notes, new re-init note, probe-draft cleanup | Claude Sonnet 5.5 | `medium` |
| 1 — pass 2 and the full `all` run (baseline) | Claude Sonnet 5.5 | `medium` |
| 2 — retire the retries, notification assertion | Claude Sonnet 5.5 | `medium` |
| 3a — Karma vs Vitest evaluation | Claude Opus 5.5 | `high` |
| 3b, 3c, 3d — single entry point, CI steps, ESLint burn-down | Claude Sonnet 5.5 | `medium` |
| 4 — small product defects (items 1–4) | Claude Sonnet 5.5 | `high` |
| 5 — reliability cluster (items 1–5) | Claude Opus 5.5 | `high` |
| 6 — design-choice defects | Claude Opus 5.5 | `high` |
| Final full `all` run | Claude Sonnet 5.5 | `medium` |

Rules for the agent:

1. **Before starting a step**, compare your model and effort with the row of that step. Your model is named in your system prompt. Your effort level is known only if the conversation shows it (for example the output of an `/effort` command); if it does not, treat it as not matching.
2. **If they match**, start the step.
3. **If they do not match**, do not start the step and do not do any part of it. Stop and tell the user, in one short message: the step that comes next, the model and effort it needs, the commands to switch (`/model`, `/effort`), and that the work continues from that step of this plan once they have switched. Then end the turn.
4. **At the end of every step** (after its commit), look at the next step's row and apply rules 1–3 before going on. Do not carry on into the next step just because the work is fresh in context.
5. **A step that turns out harder than its row assumes** (for example a Sonnet step whose failure needs a diagnosis across services) is stopped at a consistent point, and the user is asked to switch to Claude Opus 5.5 at `high` for the rest of it. The reverse is not needed: a step assigned to Opus is finished on Opus.
