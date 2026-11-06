# Tests that no GitHub Actions workflow runs

**Status:** open — found while moving the UI suite onto the shared e2e workflow (`.github/workflows/e2e-run.yml`); the e2e suites themselves are all selected by a workflow now.
**Component:** CI (`.github/workflows/`), `e2e-tests`, `frontend`, `indexer-service`
**Severity:** medium — these tests can break without anyone noticing
**Found by:** reading every workflow and grepping the Cypress tags

Nothing below has been run as part of this finding: the current pass/fail state of each item is unknown unless it says otherwise.

## What the workflows run

- `component-tests` (`main.yml`) builds, lints and runs the unit tests of the backend services and builds the frontend (`ng build`, no tests).
- `E2E Tests` (`e2e-tests.yml`) runs `smoke` on push and `api-all policy-all` nightly.
- `UI Tests` (`ui-manual.yml`) runs `ui-all dr-all` nightly and on demand.

## Not run by any workflow

### Frontend unit tests (`frontend/**/*.spec.ts`, 107 files)

`main.yml` builds the frontend but never runs `ng test`. `frontend/karma.conf.js` uses `browsers: ['Chrome']` and `singleRun: false`, so CI needs a headless Chrome launcher (`ChromeHeadless`, optionally with `--no-sandbox`) and `ng test --watch=false`.

### `indexer-service` unit tests (7 files in `indexer-service/tests`)

The package has a `test` script (mocha), but `main.yml` does not build or test any `indexer-*` package. `indexer-worker-service` and `analytics-service` also declare a `test` script; `analytics-service` is covered by `main.yml`, `indexer-worker-service` has no test files.

### Tests of the test tooling

`npm run test:scripts` in `e2e-tests` (`node --test "scripts/*.test.mjs"`) and `.github/scripts/report-test-summary.test.mjs` are not run by any workflow, so a change to the helper scripts the workflows rely on (`solo-network.mjs`, `quickstart-env.mjs`, the report scripts) is not checked.

### ESLint on the Cypress suites

`main.yml` lints the backend services only. `npx eslint cypress` in `e2e-tests` runs nowhere; adding it as a CI step is blocked by the findings listed in `eslint-findings-in-the-cypress-suites.md`.

## Already tracked elsewhere

`017_indexer`, `026_remote_policy` and `028_MGS_analytics_indexer` are skipped on purpose: `folders-blocked-by-environment.md`.

## What a fix needs

One decision per item above (delete, fix and tag, or add a step to `main.yml`). The frontend, indexer and tooling tests belong in `main.yml` (component tests); the ESLint step waits for the findings to be burned down. Delete this note once every item is either running or deliberately dropped.
