# The indexer tests are not run by any workflow or by `e2e-tests`

**Status:** open — found on 12 Nov 2026 while adding the missing test groups to CI; the indexer part was taken out again on purpose (the indexer tests do not belong in `e2e-tests` or its entry point). Nothing in the repository runs them.
**Component:** CI (`.github/workflows/main.yml`), `indexer-service`, `indexer-frontend`

## `indexer-service` (7 files in `tests/`, mocha)

`main.yml` builds and tests the backend services only. What was written, run locally and then removed from `main.yml` and from `e2e-tests/scripts/test-everything.sh`:

```yaml
- name: Indexer service tests
  run: |
    pushd indexer-interfaces
    yarn run build
    popd
    pushd indexer-common
    yarn run build
    popd
    pushd indexer-service
    yarn run build
    npm run test
    popd
  env:
    CI: true
    NODE_OPTIONS: --openssl-legacy-provider
```

The tests import compiled output (`dist/`), so `indexer-interfaces`, `indexer-common` and `indexer-service` must be built first; without that the run dies on `Cannot find module '…/@indexer/common/dist/index.js'` and then `indexer-service/dist/api/artifacts.service.js`. With the three builds the mocha run passes (12 Nov 2026). The test script writes `test_results/indexer-service.xml`, which `.github/scripts/report-test-summary.mjs` picks up with the other services.

To do: decide where the step lives (a step in `main.yml` after `Test`, or its own workflow), add it, and check it on a CI run (the job has a 30 minute timeout; the added build time was not measured there). `indexer-worker-service` declares a `test` script but has no test files.

## `indexer-frontend` (10 `*.spec.ts`, 120 tests, Karma)

Angular 17.3 with `@angular-devkit/build-angular:karma`; the only Karma left in the repository (its `angular.json`, five dev dependencies, the README and a comment in `src/app/utils/cryppo.spec.ts`).

Measured on 12 Nov 2026 (after `npm ci` in `indexer-frontend` and a build of `indexer-interfaces`): the specs do not compile as they are. The Karma build is webpack-based and cannot resolve `url('@assets/main.jfif')` in `src/app/components/header/header.component.scss` (`@assets` is only a TypeScript path; the app build, on the esbuild `application` builder, does not hit it). With that url made relative for the measurement, and Playwright's Chromium as `CHROME_BIN` launched headless with `--no-sandbox` (the dev container has no usable sandbox), 118 of 120 tests pass. The two failures are the scaffold `src/app/app.component.spec.ts`: `No provider for InjectionToken TRANSLOCO_TRANSPILER`.

To do:

- make the stylesheet url resolvable by the Karma build;
- add a `karma.conf.js` with a headless launcher (a custom launcher with `--no-sandbox` in a container);
- give the `AppComponent` spec the Transloco providers, or drop it;
- add the step to CI, with `CHROME_BIN` or Playwright's Chromium.

Moving to Vitest like `frontend` (see `frontend/vitest-base.config.ts` and its `test` target) needs an upgrade from Angular 17 to 21 first: the `unit-test` builder lives in `@angular/build`, which `indexer-frontend` does not use.
