# E2E suite performance: measurements, experiments, open issues

**Status:** measurement done, no optimisation applied yet. Experiments E1–E7 measured on 2026-11-13; E8 (all the viable optimisations together) not run yet.
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

### Concurrent logins of the same user lose a refresh token (auth-service), not verified

In E7, 4 specs failed on `POST /accounts/access-token` answering 401 to a refresh token obtained moments before (`005_profiles/getProfilesRootUser`, `014_tags/00_createGetAndDeleteModuleTags`, `008_artifacts/deleteArtifact`, `009_policies/IPFSandGeoJSONValidation`). It never happens in a sequential run.

Likely cause: a login reads the user, appends the new token id to `user.refreshToken` and saves the whole user (`auth-service/src/api/account-service.ts`, around lines 377 and 429); `GENERATE_NEW_ACCESS_TOKEN` then looks the user up by that id. Two concurrent logins of the same user both save their own copy of the array, so one id is lost and that token is refused. To verify: a unit test in `auth-service` running two logins of the same user concurrently, then refreshing both tokens. Real users logging in from two tabs at once would hit it too.

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

- `ui-tests/specs/06_policy_schemas/createPolicySchema` "import policy schema file" fails on a database where it already ran (a dialog mask covers the search field); it passed on a fresh database. Not idempotent.
- `ui-tests/specs/04_contracts/contractTags` "delete contract tag": the tag is deleted (`DELETE 200`) but `{esc}` does not close the tags dialog. Flaky.
- `ui-tests/specs/05_modules/createModule` "module ipfs import" failed once on the production frontend (3 rows instead of 4) and passed on the rerun. Flaky.

## Still to do

1. **E8**: E1 + E1b + E2 + E3 + E5 together on a full sequential run, fresh database, `STOP_POLICIES_BETWEEN_SUITES=1`, to get the realistic gain of the viable optimisations (from the single experiments: roughly −6 min contracts, −3 min KYC sleeps, −10 % on task-heavy specs, −20 % on UI specs).
2. Verify the auth-service refresh-token race with a unit test, then fix it.
3. Decide which optimisations to adopt and where:
   - E1: set the two sync masks in the e2e service environment (`scripts/local-guardian.sh`, `export_service_environment`) and in CI; then shorten the `expectNoWipeRequest` window to match.
   - E2: check on testnet whether the account info is up to date right after the KYC/freeze receipt; if so remove the sleep (product change, with a unit test).
   - E3: product change to the queue dispatch, with unit tests in `queue-service`.
   - E5: serve the production build for UI runs (README "Preparing the app for UI tests", CI).
4. Parallel runs (E7 gives 45 min instead of 93): fix the auth race, make the specs above independent of global lists and counters, keep `006_settings` alone, and stop only the shard's own policy processes.
5. Not measured yet: the queue pickup in a full run with E3 (about 12 min of waits in the baseline), tool import/publish cost in `policy-tests/cdm` (803 s), the double publish in `processFlowiRec3` (about 17 s each), and the 162 s of app bootstrap after `cy.visit` (logging in through the API instead of the UI form).
