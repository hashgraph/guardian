# Tests that no GitHub Actions workflow runs

**Status:** open — found while moving the UI suite onto the shared e2e workflow (`.github/workflows/e2e-run.yml`); the e2e suites themselves are all selected by a workflow now.
**Component:** CI (`.github/workflows/`), `e2e-tests`, `frontend`, `indexer-service`
**Severity:** medium — these tests can break without anyone noticing
**Found by:** reading every workflow and grepping the Cypress tags

Measured on 11 Nov 2026: `npm run test:scripts` 14/14 pass and `.github/scripts/report-test-summary.test.mjs` 11/11 pass. The frontend specs were not run (the dev container has no Chrome); the state of the other items is unknown.

## What the workflows run

- `component-tests` (`main.yml`) builds, lints and runs the unit tests of the backend services and builds the frontend (`ng build`, no tests).
- `E2E Tests` (`e2e-tests.yml`) runs `smoke` on push and `api-all policy-all` nightly.
- `UI Tests` (`ui-manual.yml`) runs `ui-all dr-all` nightly and on demand.

## Not run by any workflow

### Frontend unit tests (`frontend/**/*.spec.ts`, 107 files)

`main.yml` builds the frontend but never runs `ng test`. The specs run with Vitest in headless Chromium through Playwright (2310/2310 pass on 12 Nov 2026), so CI needs `npx playwright install --with-deps chromium` before `npx ng test --watch=false` in `frontend`.

### `indexer-frontend` unit tests (10 `*.spec.ts` files)

Angular 17.3 with `@angular-devkit/build-angular:karma` (the only Karma left in the repository); no workflow builds or tests `indexer-frontend`.

Measured on 12 Nov 2026 (after `npm ci` in `indexer-frontend` and a build of `indexer-interfaces`): the specs do not compile as they are. The Karma build is webpack-based and cannot resolve `url('@assets/main.jfif')` in `src/app/components/header/header.component.scss` (`@assets` is only a TypeScript path; the app build, on the esbuild `application` builder, does not hit it). With that url made relative for the measurement, and Playwright's Chromium as `CHROME_BIN` launched headless with `--no-sandbox` (the dev container has no usable sandbox), 118 of 120 tests pass. The two failures are the scaffold `app.component.spec.ts`: `No provider for InjectionToken TRANSLOCO_TRANSPILER`.

To run them: make the url resolvable by the Karma build, add a `karma.conf.js` with a headless launcher, give `AppComponent`'s spec the Transloco providers (or drop it), then add the step to CI. Moving to Vitest like `frontend` needs an upgrade from Angular 17 to 21 first (the `unit-test` builder lives in `@angular/build`).

### `indexer-service` unit tests (7 files in `indexer-service/tests`)

The package has a `test` script (mocha), but `main.yml` does not build or test any `indexer-*` package. `indexer-worker-service` and `analytics-service` also declare a `test` script; `analytics-service` is covered by `main.yml`, `indexer-worker-service` has no test files.

### Tests of the test tooling

`npm run test:scripts` in `e2e-tests` (`node --test "scripts/*.test.mjs"`) and `.github/scripts/report-test-summary.test.mjs` are not run by any workflow, so a change to the helper scripts the workflows rely on (`solo-network.mjs`, `quickstart-env.mjs`, the report scripts) is not checked.

### ESLint on the Cypress suites

`main.yml` lints the backend services only. `npx eslint cypress` in `e2e-tests` runs nowhere; it reports no finding since 12 Nov 2026, so it can be added as a CI step.

## Already tracked elsewhere

`017_indexer`, `026_remote_policy` and `028_MGS_analytics_indexer` are skipped on purpose: `folders-blocked-by-environment.md`.

## What a fix needs

One decision per item above (delete, fix and tag, or add a step to `main.yml`). The frontend, indexer and tooling tests belong in `main.yml` (component tests); the ESLint step can go in with them. Delete this note once every item is either running or deliberately dropped.
