# E2E suite performance: measurements, experiments, open issues

**Status:** E1, E1b, E2, E3 and E5 adopted on 2026-11-17, and green in CI on 2026-11-18 (`E2E Tests` with `all`, `UI Tests` with `ui-all dr-all`, with the workflow changes); parallel runs and the unmeasured items below are still open. Experiments E1–E7 measured on 2026-11-13, E8 (all the viable optimisations together) on 2026-11-17.
**Component:** `guardian-service`, `queue-service`, `auth-service`, `frontend`, `e2e-tests`
**Affects:** the duration of a full e2e run (about 93 min sequential) and the possibility of running it in parallel

The measurement tools (Cypress command logger, queue snapshotter, analyzer, shard runner) live in the git-ignored `e2e-tests/.local/timing-tools/`; the patches used for the experiments are reproduced below so this note does not depend on them.

## Baseline

Full sequential run, fresh database, `STOP_POLICIES_BETWEEN_SUITES=1`, development frontend (`ng serve`), stack in the dev container: **93.4 min** of Cypress, 961 passing, 1 flaky failure (plus 10 fixed since in `78e50f81b`).

| Area | Time | Where it goes |
|---|---|---|
| UI specs | 2984 s | 47 % waiting for elements (`div.loading` 281 s, app bootstrap after `cy.visit` 162 s, login form 69 s over 519 UI logins), typing 283 s for 11,081 characters, page loads 381 s |
| API specs | 1185 s | 53 % requests, 38 % fixed 200 ms polling (383 s in `013_contracts` waiting for the contract sync cron) |
| Policy specs | 1141 s | 94 % requests: `tools/import/file-metadata` + `tools/:id/publish` 803 s over 112 tools, policy publish 11.7 s each |

- The backend is not what makes UI specs slow: the 16,398 UI requests through the dev proxy average 0.05 s.
- Queue: 4360 tasks waited 919 s in total between queued and dispatched (median 0.17 s, p90 0.30 s); dispatch to the worker takes 5 ms. The wait comes from `getFreeWorkers` in `queue-service/src/queue-service/queue-service.ts`, which collects worker replies for a fixed 300 ms per dispatch round.
- Grant/revoke KYC and freeze/unfreeze take about 16 s each, 15 of them a fixed sleep (`guardian-service/src/api/token.service.ts`, `await new Promise(resolve => setTimeout(resolve, 15000))`, twice).
- Slowest folders: `ui-tests/specs/02_policies` 2086 s, `policy-tests/cdm` 934 s, `api-tests/013_contracts` 527 s, `policy-tests/irec` 230 s, `api-tests/009_policies` 208 s.

## Experiments

Each one ran the folders it touches, against the same folders measured just before on the same stack. Times are Cypress totals.

| Exp. | Change | Specs | Before | After | Result |
|---|---|---|---|---|---|
| E1 | `RETIRE_CONTRACT_SYNC_MASK` and `WIPE_CONTRACT_SYNC_MASK` = `*/5 * * * * *` (guardian-service environment, default `* * * * *`) | `013_contracts` | 9:19 | 3:37 | 149/149 pass |
| E1 + E1b | E1, plus the `expectNoWipeRequest` window 90 s → 15 s (`cypress/support/api/contracts.js`) | `013_contracts` | 9:19 | 2:14 | 149/149 pass |
| E2 | Remove the two 15 s sleeps in `guardian-service/src/api/token.service.ts` | `010_tokens`, `009_policies/processFlowiRec3` | 2:29 | 1:15 | 10/10 pass; the specs still assert `kyc` / `frozen` from the response, so on Solo the account info is already up to date without the sleep (not checked on testnet) |
| E3 | `getFreeWorkers` waits 50 ms instead of 300 ms, and adding a task triggers a dispatch | `009_policies`, `policy-tests/irec` | 7:25 | 6:33 | 115/115 pass; every task-heavy spec is faster (processFlowiRec3 1:18 → 1:07, iRecNewRegistry 0:56 → 0:46, each iRec policy test 6 → 5 s) |
| E4 | No typing delay (`Cypress.Keyboard.defaults({ keystrokeDelay: 0 })`) | UI `00_account_registration`, `05_modules`, `06_policy_schemas`, `09_tokens` | 11:40 | 11:26 | Within noise |
| E5 | Frontend served with `ng serve --configuration production` | same UI specs | 11:40 | 9:21 | −20 %, almost every spec faster (createToken 1:22 → 0:59, operationsPolicySchema 1:48 → 1:23) |
| E6 | Fast-forward the policy-test replay (`POST record/:policyId/running/fast-forward` while polling) | `016_policies_tests_and_flows`, `policy-tests/irec/iRec2` | 3:07 | 2:05 | **Not viable**: iRec2 replays wrong (8 documents and 0 tokens instead of 9 and 1). The recorded delays cover asynchronous work of the previous step, which the replay does not wait for otherwise |
| E7 | 3 parallel Cypress runners (`000_accounts_creating` and `006_settings` first, alone), development frontend | full suite | 93.4 min | 45:07 | 12 of 270 specs fail (below). Each shard ran about 1.4× slower than its sequential share |
| E8 | E1 + E1b + E2 + E3 + E5 together, full sequential run, fresh database, `STOP_POLICIES_BETWEEN_SUITES=1` | full suite | 93.4 min | 69:03 | 983 passing, 7 failing specs (below); about 74 min once the failures are accounted for |

### E8 in detail

Same command as the baseline (`npm run test:everything -- lint scripts cypress`, with the command logger), with the patches below applied and the services started with the E1 masks.

On the 240 specs that passed in both runs, the time went from 68.9 to 59.7 min (−13 %):

| Group | Specs | Baseline | E8 | Change |
|---|---|---|---|---|
| API | 158 | 586 s | 448 s | −24 % |
| Policy | 33 | 1124 s | 1004 s | −11 % |
| UI | 48 | 2391 s | 2102 s | −12 % |

- Largest gains per spec: `010_tokens/putGrantRevokeKyc` and `putFreezeUnfreeze` 33 → 2 s each (E2), `009_policies/processFlowiRec3` 67 → 44 s, `policy-tests/irec/iRecNewRegistry` 55 → 33 s, every `02_policies` UI spec 10–20 % faster.
- `013_contracts` failed in E8; run again right after on the same stack, it passed 149/149 in 1:42 (baseline 9:19).
- The 69 min understate a passing run: `flow_CDM_0001` failed after 1:10 instead of taking about 9 min, and `013_contracts` stopped early. With those at their passing times, the run takes about 74 min, about 20 min (21 %) less than the baseline.

The 7 failing specs. None of them is caused by the patches, as far as the reruns show:

- `009_policies/postPoliciesImportMsgPreview`: mirror node answered 503 once; it passed on rerun. Fixed since: the worker retries a transient mirror error when reading topic messages.
- `013_contracts/006_setPools`: the mirror node did not have the new token yet (404, no retry). `007_getPools` and `008_getWipeRequests` then failed with it. The folder passed 149/149 on rerun. Both mirror failures are in `contract-import-fails-on-a-transient-mirror-node-502.md`; the 404 is fixed since (the worker now waits for the mirror node to index the token).
- `025_policy_labels/07_getTokensPolicyLabel`, `08_postDocument`: they read the tokens of the newest published `iRec_4` copy, which only `013_contracts` had minted in, and `015` and `024` now publish newer copies. Fixed since: `00` publishes its own copy and mints a token in it.
- `ui-tests/specs/02_policies/flow_CDM_0001`: the tool picker stayed open (`cdm-import-tool-picker-stays-open.md`), the same failure as on 14 Nov.

### Patches used

E1b (`e2e-tests/cypress/support/api/contracts.js`): `expectNoWipeRequest(..., { token, window: waitWindow = 90000 })` → `15000`.

E2 (`guardian-service/src/api/token.service.ts`): delete both `await new Promise(resolve => setTimeout(resolve, 15000));` lines before the `GET_ACCOUNT_INFO` task.

E3 (`queue-service/src/queue-service/queue-service.ts`):

```diff
@@ addTaskToQueue
         te.processedTime = null;
         await dataBaseServer.save(TaskEntity, te);
+        this.refreshAndReassignTasks().catch((error) => console.error('Error while dispatching a new task:', error));
     }
@@ getFreeWorkers
             setTimeout(() => {
                 subscription.unsubscribe();
                 resolve(workers);
-            }, 300);
+            }, 50);
```

E4: a support file that imports `cypress/support/e2e.js` and calls `Cypress.Keyboard.defaults({ keystrokeDelay: 0 })`.

E5: `cd frontend && UI_GATEWAY_ORIGIN=http://127.0.0.1:3002/ npx ng serve --configuration production --host 127.0.0.1 --port 4200 --proxy-config ./proxy.hostdocker.js`.

E7: run Cypress once per shard with its own `DISPLAY` (Cypress starts its own Xvfb on `:99`, so concurrent instances collide), and with `CYPRESS_hederaNet`, `CYPRESS_operatorId` and `CYPRESS_operatorKey` taken from `.solo/solo.env` as `entrypoint.sh` does (without them Cypress falls back to `testnet` message ids).

## Issues found

### Concurrent logins of the same user lost a refresh token (auth-service), fixed

In E7, 4 specs failed on `POST /accounts/access-token` answering 401 to a refresh token obtained moments before (`005_profiles/getProfilesRootUser`, `014_tags/00_createGetAndDeleteModuleTags`, `008_artifacts/deleteArtifact`, `009_policies/IPFSandGeoJSONValidation`). It never happens in a sequential run.

Cause, confirmed by `auth-service/tests/account-service-refresh-tokens.test.mjs`: the login (`GENERATE_NEW_TOKEN`) read the user, appended the new token id to `user.refreshToken` and saved the whole user, so two concurrent logins of the same user each saved their own copy of the array and one id was lost; `GENERATE_NEW_ACCESS_TOKEN` then refused that token. The login now adds the id with an atomic `$push` (`UserUtils.addRefreshToken`). Not yet confirmed with a parallel e2e run. `CHANGE_USER_PASSWORD` still saves the whole user, so a login concurrent with a password change can still lose its token.

### `POST /settings` restarts every published and dry-run policy

`006_settings/postSettings` posts the operator settings; `config.service.ts` then calls `ValidateConfiguration.validate()`, which re-runs the guardian-service initialization, and `policyEngine.init()` starts the process of every policy in `PUBLISH` / `DRY_RUN` / `DEMO` / `VIEW` status. On a database that had seen several runs that was 78 processes (about 20 GB): Claude Code stopped the run for low memory. While re-initializing, guardian-service answers `Error: Initialization`, which failed an import running in another shard.

Test impact: in a sequential run with `STOP_POLICIES_BETWEEN_SUITES=1`, the published policies of every folder before `006_settings` run again from there on; with parallel runners `006_settings` has to run alone. Whether re-initializing (and restarting every policy) on a settings change is intended is a product question.

### Specs that interfere when run in parallel

In E7, besides the 4 auth failures:

- `025_policy_labels/02_getPolicyLabelRelationships`, `07_getTokensPolicyLabel`, `08_postDocument`: the label's policy is not in the list they read.
- `021_notifications/03_readAllNotifications`: notifications created by another shard in the meantime.
- `013_contracts/014_getRetireVCS`: no retire VC within 20 s.
- `ui-tests/specs/02_policies/flow_CDM_0001`, `dryRunMint`, `iREC5Group`: element covered or not found in time.

Running in parallel also needs a policy stop limited to the shard's own processes: `stopPolicies` stops every policy process, so `STOP_POLICIES_BETWEEN_SUITES` cannot be used with parallel runners.

### Other test problems seen along the way

- `ui-tests/specs/06_policy_schemas/createPolicySchema` "import policy schema file" imported the schema file into the first policy of the dropdown; when that policy already held a schema of the same name (`Lead User Details` is in the iRec policies), the app opened the "Schemas for replace" dialog and its mask covered the search field. It depended on which policies other folders had imported. Fixed: the spec imports into a draft policy of its own.
- `ui-tests/specs/04_contracts/contractTags` "delete contract tag": the tag is deleted (`DELETE 200`) but `{esc}` does not close the tags dialog. Flaky.
- `ui-tests/specs/05_modules/createModule` "module ipfs import" counted the imported rows on the first page of the module list (10 rows, newest first) before and after the import; past ten modules the new row pushes another off the page, so the count could stay the same. It failed on the second run over a database. Fixed: the import helpers check the module the import request created, and the specs delete exactly that module.

## Adopted

- E1: `RETIRE_CONTRACT_SYNC_MASK` and `WIPE_CONTRACT_SYNC_MASK` every 5 s in `scripts/local-guardian.sh` and `.github/workflows/e2e-run.yml`; E1b: `expectNoWipeRequest` watches for 15 s.
- E2: the 15 s sleeps are removed; the KYC and freeze transactions already resolve on their receipt.
- E3: the free-worker reply window is `WORKER_FREE_RESPONSE_WINDOW` (default 300 ms, 50 ms in the e2e environment), and a new task starts a dispatch round right away.
- E5: UI runs serve `ng serve --configuration production` (README "Preparing the app for UI tests", CI).
- Found by E8: `get-token-info` now waits for the mirror node to index a new token, and reading topic messages and account tokens retries a transient mirror error (429, 502, 503, 504).
- CI: the e2e workflow sets the E1 and E3 variables, serves the production frontend and stops the policy processes between suites (`STOP_POLICIES_BETWEEN_SUITES=1`).
- Found in CI: `025_policy_labels` publishes its own `iRec_4` copy and mints a token in it, instead of reading the copy `013_contracts` minted in.

## Still to do

1. Parallel runs (E7 gives 45 min instead of 93): check that the auth fix removes the 401s, make the specs above independent of global lists and counters, keep `006_settings` alone, and stop only the shard's own policy processes.
2. Not measured yet: the queue pickup in a full run with E3 (about 12 min of waits in the baseline; the E8 task snapshots are in `.local/e8-tasks.jsonl`), tool import/publish cost in `policy-tests/cdm` (803 s), the double publish in `processFlowiRec3` (about 17 s each), and the 162 s of app bootstrap after `cy.visit` (logging in through the API instead of the UI form).

## Cypress 16

Migration of `e2e-tests` from Cypress 15.15.0 to 16.3.0 on Chromium (plan in `.local/plan-cypress-16.md`, branch `e2e-cypress-16`). Measured with the per-spec durations of the mochawesome JSONs, on the same stack, `STOP_POLICIES_BETWEEN_SUITES=1`, production frontend.

### Baseline: Cypress 15.15.0 on Chromium 156 (2026-11-18)

The pilot set (the `000_accounts_creating` prerequisite, the `smoke` API tag, the UI specs of `00_account_registration`, `05_modules`, `06_policy_schemas`, `09_tokens`, `02_policies/dryRunMint` and `02_policies/iREC5Group`, and `policy-tests/irec`), run twice in a row on a fresh stack (empty database, two consecutive runs on it). Chromium is used for the baseline too, so the comparison with 16.3 measures the Cypress version and not the browser.

| Group | Run 1 | Run 2 |
|---|---|---|
| API (smoke) | 137.9 s | 138.8 s |
| UI | 731.1 s | 743.5 s |
| Policy (`irec`) | 153.8 s | 156.0 s |
| Sum of the spec durations | 1022.8 s | 1038.3 s |
| Wall clock of the run (with Cypress start-up for each phase) | 1197 s | 1189 s |
| UI logins through the form (`POST /accounts/login` through the frontend proxy; the proxy log has a request and a response line for each, and the comparison script counted both: 134 and 132 lines) | 67 | 66 |

Failures, all known:

- `06_policy_schemas/createPolicySchema` "import policy schema file" in both runs: the import went to a policy that already held a schema of the same name (see above, "Other test problems").
- `05_modules/createModule` "module ipfs import" in run 2 only (5 rows expected, 4 found): the first-page count (see above, "Other test problems").
- `008_artifacts/postArtifact` "Upload artifact" in run 2 only: `POST /artifacts/<id>` answered 422. The spec uploaded to the newest policy in the list, which has to be a draft of the same registry. In that run `008_artifacts` was the first folder of the smoke run, right after the `policy-tests/irec` phase of run 1, which ends with `iRecNewRegistry` publishing a policy of another registry; the database has been dropped since, so which policy it was is not verified. Fixed: the spec uploads to a draft policy of its own.

Per-spec durations of the UI and policy specs:

| Spec | Run 1 (s) | Run 2 (s) | Failures run 1 / run 2 |
|---|---|---|---|
| policy-tests/irec/iRec.cy.js | 3.8 | 4.1 | 0 / 0 |
| policy-tests/irec/iRec10.cy.js | 3.8 | 3.9 | 0 / 0 |
| policy-tests/irec/iRec10NTC.cy.js | 3.8 | 3.9 | 0 / 0 |
| policy-tests/irec/iRec10Source.cy.js | 3.7 | 4.0 | 0 / 0 |
| policy-tests/irec/iRec2.cy.js | 74.4 | 75.0 | 0 / 0 |
| policy-tests/irec/iRec3.cy.js | 3.7 | 3.8 | 0 / 0 |
| policy-tests/irec/iRec4.cy.js | 3.6 | 3.8 | 0 / 0 |
| policy-tests/irec/iRec4RM.cy.js | 3.7 | 3.8 | 0 / 0 |
| policy-tests/irec/iRec5.cy.js | 3.7 | 3.8 | 0 / 0 |
| policy-tests/irec/iRec6.cy.js | 3.8 | 3.8 | 0 / 0 |
| policy-tests/irec/iRec7.cy.js | 3.7 | 3.7 | 0 / 0 |
| policy-tests/irec/iRec8.1.cy.js | 3.7 | 3.8 | 0 / 0 |
| policy-tests/irec/iRec8.2.cy.js | 3.8 | 3.8 | 0 / 0 |
| policy-tests/irec/iRec9.cy.js | 3.8 | 3.8 | 0 / 0 |
| policy-tests/irec/iRecNewRegistry.cy.js | 31.0 | 31.0 | 0 / 0 |
| ui-tests/specs/00_account_registration/createAccount_Generate.cy.js | 26.8 | 26.9 | 0 / 0 |
| ui-tests/specs/00_account_registration/createAccount_NonHappyFlows.cy.js | 27.6 | 27.9 | 0 / 0 |
| ui-tests/specs/00_account_registration/createAccount_ProvideCredentials.cy.js | 27.8 | 27.7 | 0 / 0 |
| ui-tests/specs/02_policies/dryRunMint.cy.js | 93.9 | 93.8 | 0 / 0 |
| ui-tests/specs/02_policies/iREC5Group.cy.js | 177.0 | 168.1 | 0 / 0 |
| ui-tests/specs/05_modules/createModule.cy.js | 20.3 | 34.2 | 0 / 1 |
| ui-tests/specs/05_modules/deleteModule.cy.js | 9.0 | 9.0 | 0 / 0 |
| ui-tests/specs/05_modules/exportModule.cy.js | 17.4 | 17.7 | 0 / 0 |
| ui-tests/specs/05_modules/moduleTags.cy.js | 19.7 | 21.3 | 0 / 0 |
| ui-tests/specs/05_modules/publishModule.cy.js | 23.5 | 22.3 | 0 / 0 |
| ui-tests/specs/05_modules/verifyModulesUi.cy.js | 18.9 | 19.1 | 0 / 0 |
| ui-tests/specs/06_policy_schemas/createPolicySchema.cy.js | 37.8 | 38.7 | 1 / 1 |
| ui-tests/specs/06_policy_schemas/operationsPolicySchema.cy.js | 62.2 | 63.4 | 0 / 0 |
| ui-tests/specs/06_policy_schemas/policySchemaTags.cy.js | 31.5 | 31.9 | 0 / 0 |
| ui-tests/specs/09_tokens/createToken.cy.js | 47.6 | 47.9 | 0 / 0 |
| ui-tests/specs/09_tokens/deleteToken.cy.js | 30.6 | 32.0 | 0 / 0 |
| ui-tests/specs/09_tokens/editToken.cy.js | 35.5 | 37.0 | 0 / 0 |
| ui-tests/specs/09_tokens/tagsTokens.cy.js | 23.9 | 24.5 | 0 / 0 |

### Cypress 16.3.0 on Chromium: what the probe confirmed (2026-11-18)

A throwaway spec, run with `cypress run --browser chromium` on 16.3.0 in the dev container, printed what reaches the browser and how Chromium is launched:

- `Cypress.env` still exists as a function, and every call throws "`Cypress.env()` was removed in Cypress version 16.0.0".
- `Cypress.expose()` merges the `expose` config key, `--expose key=value` and what `setupNodeEvents` puts in `config.expose`. `CYPRESS_<key>` variables and `--env` go to `config.env` only. `CYPRESS_EXPOSE='<json>'` sets the whole `expose` object and replaces the config's `expose` key instead of merging with it.
- `cy.env([...])` returns the requested keys found in `env` (`cypress.env.json`/config, `CYPRESS_*`, `--env`) and omits the missing ones without failing.
- Defaults: `visibilityStrategy` is `modern`, `manageBrowserMemory` is `true`.
- `Cypress.browser` reports `chromium` 156, headless (`--headless=new`). Cypress already launches Chromium with `--disable-dev-shm-usage` (and `--no-sandbox`, `--disable-gpu`), so the 64 MB `/dev/shm` of the CI container needs no launch argument of our own.

### Pilot set on Cypress 16.3 / Chromium 156, compared with the baseline (2026-11-18)

Same pilot set, same sequence (`000_accounts_creating`, `smoke`, UI, `policy-tests/irec`), two runs in a row on a fresh database, `STOP_POLICIES_BETWEEN_SUITES=1`. What changed besides the Cypress version: the UI specs run on the static production build (`scripts/serve-frontend.mjs`) instead of `ng serve --configuration production`, logins go through `cy.session()`, and `00_account_registration` has the new `signIn` spec (9 s). The two frontends serve the same optimized code; `ng serve` adds a 75 MB inline source map to `main.js` (93 MB instead of 17 MB), which Cypress 16 cannot load at all on Chrome (below), so the UI gain mixes the frontend change, the sessions and Cypress 16.

| Group | 15.15, `ng serve` (mean of 2) | 16.3, static build (mean of 2) | Change |
|---|---|---|---|
| API (smoke) | 138.4 s | 151.3 s | +9 % |
| UI | 737.3 s | 610.4 s (601.3 s without `signIn`) | −17 % (−18 %) |
| Policy (`irec`) | 154.9 s | 157.0 s | +1 % |
| Sum of the spec durations | 1030.5 s | 918.7 s | −11 % |
| Wall clock of the run | 1197 s / 1189 s | 1075 s / 1101 s | −9 % |
| UI logins through the form | 67 / 66 | 8 / 7 | −89 % |

- UI: every spec but `dryRunMint` (−4 %) and `createAccount_Generate` (−5 %) is 11 to 34 % faster; the module, schema and token specs, which sign in in every test, gain 19 to 34 % (`createModule` 11 %).
- API: no per-spec overhead. The difference is a few seconds on specs bound by the backend and Hedera (`postSettings` +3.2 s, `seedHederaArtefacts` +2.4 s, `dryRunPolicies` +1.8 s), within the spread of those specs.
- Policy: unchanged, it is bound by the policy workflow.
- Failures: the same three as the baseline (`createPolicySchema` in run 1, `createModule` and `postArtifact` in run 2), none from the migration: each depended on data of other spec folders (above, "Other test problems" and the baseline). They are fixed; with them fixed, `05_modules`, `06_policy_schemas` and `008_artifacts` passed twice in a row, except `008_artifacts/deleteArtifact` on its second run (`artifact-upload-leaves-the-artifact-list-cached.md`). In run 2 `postArtifact` uploaded to `iRec_5`, published moments before by `seedHederaArtefacts` (`Policy is not in DRAFT status`).
- A restored session reuses the refresh token its form login created, so a user gets one new refresh token per run instead of one per UI login.

Per-spec durations of the UI specs and of the two long `irec` specs:

| Spec | 15.15 (s, mean of 2) | 16.3 (s, mean of 2) | Change |
|---|---|---|---|
| policy-tests/irec/iRec2.cy.js | 74.7 | 74.9 | 0 % |
| policy-tests/irec/iRecNewRegistry.cy.js | 31.0 | 31.2 | 1 % |
| ui-tests/specs/00_account_registration/createAccount_Generate.cy.js | 26.9 | 25.4 | -5 % |
| ui-tests/specs/00_account_registration/createAccount_NonHappyFlows.cy.js | 27.8 | 22.7 | -18 % |
| ui-tests/specs/00_account_registration/createAccount_ProvideCredentials.cy.js | 27.8 | 23.6 | -15 % |
| ui-tests/specs/00_account_registration/signIn.cy.js | - | 9.1 | - |
| ui-tests/specs/02_policies/dryRunMint.cy.js | 93.8 | 90.1 | -4 % |
| ui-tests/specs/02_policies/iREC5Group.cy.js | 172.5 | 142.7 | -17 % |
| ui-tests/specs/05_modules/createModule.cy.js | 27.3 | 24.3 | -11 % |
| ui-tests/specs/05_modules/deleteModule.cy.js | 9.0 | 6.2 | -31 % |
| ui-tests/specs/05_modules/exportModule.cy.js | 17.6 | 12.6 | -29 % |
| ui-tests/specs/05_modules/moduleTags.cy.js | 20.5 | 14.3 | -30 % |
| ui-tests/specs/05_modules/publishModule.cy.js | 22.9 | 15.2 | -34 % |
| ui-tests/specs/05_modules/verifyModulesUi.cy.js | 19.0 | 13.9 | -27 % |
| ui-tests/specs/06_policy_schemas/createPolicySchema.cy.js | 38.2 | 30.6 | -20 % |
| ui-tests/specs/06_policy_schemas/operationsPolicySchema.cy.js | 62.8 | 47.7 | -24 % |
| ui-tests/specs/06_policy_schemas/policySchemaTags.cy.js | 31.7 | 22.7 | -28 % |
| ui-tests/specs/09_tokens/createToken.cy.js | 47.8 | 38.6 | -19 % |
| ui-tests/specs/09_tokens/deleteToken.cy.js | 31.3 | 24.6 | -21 % |
| ui-tests/specs/09_tokens/editToken.cy.js | 36.3 | 28.4 | -22 % |
| ui-tests/specs/09_tokens/tagsTokens.cy.js | 24.2 | 17.5 | -28 % |

### Found while migrating

- `ng serve` cannot serve the UI specs on Cypress 16 with Chrome. On Chrome, Cypress 16 rewrites the scripts of the page under test and hands them back to the browser through CDP (`Fetch.fulfillRequest`, base64). `main.js` from `ng serve` is 93 MB, 76.5 MB of it an inline source map the dev server adds; base64 makes it about 124 MB, over Chromium's 100 MB limit for a DevTools message (`Too large read data is pending: capacity=104857600`). Chromium closes the DevTools connection, Cypress does not reconnect, and the run waits forever on the first `cy.visit` with no timeout. Cypress 15 loaded the page through its own proxy and was not affected; Electron on 16.3 is not affected either. The static production build (`main.js` 17 MB) loads in 3 s.
- Measuring needs a fresh database: on a database that kept the policies of earlier runs, `POST /settings` (`006_settings/postSettings`) re-initializes guardian-service for minutes (see "`POST /settings` restarts every published and dry-run policy" above), the next suite's `before:spec` stops policies in the middle of it and the run stops. That run also left the stack on the spec's throwaway operator, because its `after` hook never ran.

### Full sequential run on Cypress 16.3 / Chromium 156 (2026-11-18)

`npm run test:everything -- lint scripts cypress` on a fresh database, `STOP_POLICIES_BETWEEN_SUITES=1`, static production frontend, 278 specs (E8 ran 277): **1:13:02**, 1011 of 1033 tests passing, 20 pending, 1 failing, 1 skipped. E8 (Cypress 15.15, Electron, `ng serve`, same sequence) took 1:09:03 with 7 failing specs.

| Group | E8 (15.15) | 16.3 |
|---|---|---|
| `api-tests` | 13.7 min | 13.4 min |
| `ui-tests` | 36.8 min | 37.0 min |
| `policy-tests` | 16.7 min | 20.7 min |

The full run does not show the gain of the pilot set (UI -17 %, wall clock -9 %); the UI group is flat and `policy-tests` is 4 min slower, 3 min of it in six `policy-tests/cdm` specs (`cdmIC` 85 → 126 s, `cdmIE` 95 → 127 s, `cdmIIIH`, `cdmIIID`, `cdmIIIF`, `cdmIF`). Why is not known: the CDM specs are driven through the API and spend their time in the backend and on Hedera, the pilot's `policy-tests/irec` set is at parity (155 vs 157 s), and the Solo mirror node answered 502/503 for a few seconds after a restart of the services during the same session, so the stack was not as quiet as in the baseline. Not measured: the same run on 15.15 on today's stack. Until it is, the Cypress 16 gain is only what the pilot shows.

Failures, all explained:

- First attempt: 234 of 278 failed. `PUT /profiles/StandardRegistry` (`create_accounts`) timed out because the Solo mirror node answered 502/503 for a few seconds right after the services restarted; every later spec depends on those accounts. `000_accounts_creating` run alone afterwards passed (12/12) and the second attempt, started when the mirror answered 200 to 15 requests in a row, passed everything but one spec. The cause inside Solo was not investigated; the failure is the stack's, not the migration's.
- `ui-tests/specs/02_policies/editPolicy` "Modify Existing block…" failed three times in a row on Chrome (it passed in E8 on Electron). The editor selects the policy root when it finishes loading, `openEditingPolicy` returned while the editor was still under its loading overlay, and the spec's selection of `Block_1` was overridden: the Tag edit landed on the policy root, so `Block_12` was never saved. `openEditingPolicy` now waits for the overlay to go (`waitForPageSettled`), and the spec passed twice in a row. Checked first: waiting for the save request (`PUT /policies/:id`, 200) did not change the result.
- `scripts/entrypoint.test.mjs` failed in the first attempt because the shell that started the run had `CYPRESS_*` variables exported and the sandbox passed them on to `entrypoint.sh`; the sandbox now drops them.
