# Guardian E2E Tests suites

The `/e2e-tests` folder comprises the Guardian Cypress test automation framework and automated UI and API tests runnable on the local machine or via Docker.

## Quickstart

You need Node.js 24, Docker, `kind` and `kubectl`. From a fresh clone:

```bash
cd e2e-tests
npm ci                       # the test dependencies
npm run guardian:build       # installs the Guardian workspace and builds the packages the stack runs
npm run solo:up              # the network, once
npm run guardian:up          # MongoDB, NATS, Valkey and Kubo containers, then every Guardian service
npm run guardian:status      # checks the network, the infra and every service, one line each
npm run guardian:test:smoke  # only the tests tagged smoke
```

`guardian:status` prints `OK` or `FAIL` for the Solo network, each infra container and each service (process running, connected to NATS, gateway answering), with the log of every service, and exits non-zero when a check fails. `guardian:test` and `guardian:test:smoke` run the same checks first and stop when one fails. `guardian:services:up` stops with the log of a service that exits at startup, and refuses to start while something already listens on the gateway port `3002`.

The services run the built `dist/` folders: after changing the Guardian sources, run `npm run guardian:build` again and restart them with `npm run guardian:services:down` and `npm run guardian:services:up`.

**NOTE: Behind a TLS-intercepting proxy (for example Zscaler) image pulls inside the kind node fail with `x509: certificate signed by unknown authority`**. Set `SOLO_EXTRA_CA_CERT` to the PEM bundle of the proxy CA and `solo:up` installs it in the node before Solo creates any pod:

```bash
SOLO_EXTRA_CA_CERT=/path/to/proxy-ca.pem npm run solo:up
```

```bash
# Other commands
npm run guardian:test        # the whole suite
npm run guardian:test -- cypress/e2e/api-tests/001_demo/getRandomKey.cy.js   # a single spec
npm run guardian:test -- 'cypress/e2e/api-tests/010_tokens/*.cy.js' cypress/e2e/api-tests/001_demo/getRandomKey.cy.js   # several specs or globs
npm run guardian:down        # stops the services and removes the containers
npm run guardian:stop-policies                      # stops the policy processes, keeping the services and the database
STOP_POLICIES_AFTER_TESTS=1 npm run guardian:test   # the same, once the suite ends
```

Every published or dry-run policy runs in its own process (about 280 MB), which stays up until the services stop: a whole suite leaves about 55 of them, 13 GB. `guardian:stop-policies` sends each one the `DELETE_POLICY` event, so it exits cleanly and is not respawned (a process killed by a signal is respawned by policy-service after 10 s). It removes nothing from the database. The specs are idempotent and publish what they need, so a later run does not need the stopped processes. `STOP_POLICIES_AFTER_TESTS=1` makes `guardian:test`, `guardian:test:smoke` and `test:everything` do it when Cypress ends, whatever its result, and keep the Cypress exit status.

The two halves can run in different places, for example when the tests are driven from a dev container that has no docker:

```bash
npm run guardian:infra:up        # on the host: MongoDB, NATS, Valkey and Kubo containers
npm run guardian:build           # in the dev container: installs and builds Guardian for the container's platform
npm run guardian:services:up     # in the dev container: every Guardian service, gateway on http://127.0.0.1:3002
npm run guardian:services:down   # restart the services without touching the infra or the database
npm run guardian:infra:down      # on the host: removes the containers
```

`INFRA_HOST` is where the services reach the infra and the Hedera network: `127.0.0.1` by default, `host.docker.internal` when `/.dockerenv` exists. Export it to override the detection. The dev container has its own network namespace, so point Cypress at `http://127.0.0.1:3002` there (`--env apiServer=http://127.0.0.1:3002`).

## Running every test

`npm run test:everything` runs, one group after the other, everything the repository tests outside the service unit tests of `main.yml`: the linter on the specs, the tests of the helper scripts, the frontend unit specs and the whole Cypress suite. A group that fails does not stop the others; the summary at the end lists each one and the exit code is non-zero when any failed. Name the groups to run only those:

```bash
npm run test:everything                       # lint, scripts, frontend, cypress
npm run test:everything -- lint scripts       # only the linter and the helper-script tests
```

It expects the [Quickstart](#quickstart) to be done and does not touch the stack: the `cypress` group runs against the services already running, so after changing the Guardian sources rebuild and restart them first, as the Quickstart says. When the `cypress` group runs, it first checks the stack with `npm run guardian:status` and stops before any group if a check fails. Then it prepares, once, what the Quickstart does not: `npm ci` in `frontend` and `npx playwright install chromium`, when the `frontend` group runs. If that fails, the `frontend` group is reported as failed and the others still run.

| Group | What it runs |
|---|---|
| `lint` | `npx eslint cypress` |
| `scripts` | `npm run test:scripts` and `.github/scripts/report-test-summary.test.mjs` |
| `frontend` | `npx ng test --watch=false` in `frontend` (Vitest, headless Chromium) |
| `cypress` | `npm run guardian:test` |

In the dev container, prefix the command with `NODE_OPTIONS=--use-system-ca` when you run the `frontend` group: the Playwright download goes through the container's TLS proxy, whose certificate is only in the system store.

## Running tests manually

Unless specified otherwise, the tests are idempotent and can be run multiple times without side effects, and in any order. The only requirement is preparing the environment with a few accounts using the `preparing` tag, and ensuring the accounts have enough balance for the operations performed during the tests (especially the StandardRegistry):

```bash
export CYPRESS_portApi=3000/api/v1
TAG=preparing ./run-test-by-tag.sh
```

See [Running Tests with Tags](#running-tests-with-tags) below for more details.

## Linting the tests

Run the linter on the specs and helpers (the folders Cypress generates, such as `cypress/reports` and `cypress/test_results`, are excluded in `eslint.config.mjs`) and fix what it reports before committing:

```bash
npx eslint cypress
```

The linter reports no finding, and CI keeps it that way. Rules worth knowing:

- `cypress/unsafe-to-chain-command`: a command that changes the subject (`click`, `clear`, `type`, `blur`, `invoke`) must not be followed by another chained command; re-query instead (`cy.get(selector).clear(); cy.get(selector).type(value);`).
- `cypress/no-assigning-return-values`: a Cypress command returns a chainable, not a value; use `.then()` or an alias (`.as()` and `cy.get('@name')`).
- `cypress/no-unnecessary-waiting`: wait for the condition, never for a fixed time. Take budgets from `support/CustomHelpers/timeouts.js` (`TIMEOUTS.ui`, `TIMEOUTS.backend`, `TIMEOUTS.longOperation`), poll backend state with `pollUntil` (`support/checkingMethods.js`), wait for a policy block with `waitForBlockAvailable`, and for UI state use a retrying `cy.get(..., { timeout }).should(...)`. Polling loops pause `POLL_INTERVAL` between two reads; the only fixed pause left is the 1 s in `waitForTaskComplete`, silenced with a reason.
- `max-len` (360): build a long document as an object and `JSON.stringify` it (as `support/CustomHelpers/systemSchemas.js` does), or split the string.

To check that a change adds no finding, compare with the findings of the last commit. Extract it with `git archive HEAD e2e-tests/cypress/e2e e2e-tests/cypress/support e2e-tests/eslint.config.mjs e2e-tests/package.json | tar -x -C <dir>`, symlink `node_modules` into it and run `npx eslint cypress` there. ESLint pads its columns to the longest message of each file, so squeeze repeated spaces before diffing the two outputs.

## Guardian E2E via Docker

### Prerequisites

- Docker Desktop (or Docker Engine + Compose)
- Guardian backend reachable from Docker (default: API gateway at `host.docker.internal:3002`)

### Quick Start (Most Common Commands)

Use the sections below for API/UI Docker and local runs.

### Run API tests (Docker)

All API tests:

```bash
cd e2e-tests
docker compose run --rm --build cypress-api
```

Sanity example (multi-tag):

```bash
cd e2e-tests
CYPRESS_grepTags="preparing policies" CYPRESS_grepFilterSpecs=true docker compose run --rm --build cypress-api
```

Smoke example:

```bash
cd e2e-tests
CYPRESS_grepTags="smoke" CYPRESS_grepFilterSpecs=true docker compose run --rm --build cypress-api
```

### Run UI tests (Docker)

All UI tests:

```bash
cd e2e-tests
docker compose run --rm --build cypress-ui
```

UI smoke (small suite by tags):

```bash
cd e2e-tests
CYPRESS_grepTags="ui smoke" CYPRESS_grepFilterSpecs=true docker compose run --rm --build cypress-ui
```

### Reports

After any Docker run:

```bash
cd e2e-tests
open cypress/reports/html/index.html
```

Linux/WSL alternative:

```bash
cd e2e-tests
xdg-open cypress/reports/html/index.html
```

### Useful overrides

- **API origin** (Docker Desktop): `CYPRESS_apiServer=http://host.docker.internal:3002/api/v1`
- **UI → API gateway** (for the `ui` container): `UI_GATEWAY_HOST` / `UI_GATEWAY_PORT`

Example:

```bash
cd e2e-tests
UI_GATEWAY_HOST=host.docker.internal UI_GATEWAY_PORT=3002 docker compose run --rm --build cypress-ui
```

## Guardian E2E native

### Description

- [Software Requirements](#software-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Running Tests with Tags](#running-tests-with-tags)
- [Docker Setup](#docker-setup)
- [CI/CD Integration](#cicd-integration)
- [Test Reports](#test-reports)
- [Troubleshooting](#troubleshooting)

### Software Requirements

- Node.js 24 and above
- Docker and Docker Compose (for Docker-based test execution)
- Follow steps from the [README](https://github.com/hashgraph/guardian/blob/main/README.md) to install and deploy the Guardian application.

### Installation

#### Manual Setup

From the `/e2e-tests` folder, install Cypress and the other test dependencies from the lockfile:

```bash
npm ci
```

### Configuration

#### Environment Variables

If you built the Guardian in Docker, set the `portApi` variable in `cypress.env.json` file. The configuration supports the following variables:

- `portApi` - API port (default: `4200/api/v1`)
- `baseUrl` - Base URL for the application (default: `http://localhost:4200`)
- `operatorId` - Hedera operator ID (empty by default – must be supplied)
- `operatorKey` - Hedera operator key (empty by default – must be supplied)
- `ipfsStorageApiKey` - IPFS storage API key (empty by default; only needed for a non-local `IPFS_PROVIDER`)
- `mongoUrl` - MongoDB of the Guardian stack (default: `mongodb://localhost:27017`, then `mongodb://host.docker.internal:27017`). Only the disaster-recovery spec uses it: it removes the original registry from `guardian_db` and `auth_db` before restoring it, as on a new, empty instance
- `MGSAdmin` - MGS tenant name
- `MGSIndexerAPIToken` - MGS Indexer API token

### Usage

#### Interactive Dashboard

To run a specific test from the UI, you can open the Cypress dashboard:

```bash
npx cypress open
```

#### Local Command Line Execution

The project pins Cypress 15 (`package.json`). `--env` takes either `key=value` pairs separated by commas or a JSON object, so separate several tags with spaces, not commas (see [--env and "Cannot parse as valid JSON"](#--env-and-cannot-parse-as-valid-json) below).

##### Run all API tests (most basic)

```bash
npx cypress run --browser chrome --env "grepTags=api-all,grepFilterSpecs=true"
```

##### Run with specific tags (sanity testing with user preparation)

```bash
npx cypress run --browser chrome --headed --env "grepTags=preparing policies,grepFilterSpecs=true"
```

The same with a JSON object:

```bash
npx cypress run --browser chrome --headed --env '{"grepTags":"preparing policies","grepFilterSpecs":true}'
```

##### Run single test file

```bash
npx cypress run --spec "path/to/file.cy.js"
```

##### Run all UI tests

```bash
npx cypress run --env "grepTags=ui,grepFilterSpecs=true"
```

##### Preparing the app for UI tests

UI tests drive the real frontend, so the app must be running where `CYPRESS_baseUrl` points:

```bash
cd frontend
UI_GATEWAY_ORIGIN=http://host.docker.internal:3002/ \
  ng serve --host 127.0.0.1 --port 4200 --proxy-config ./proxy.hostdocker.js
```

- `UI_GATEWAY_ORIGIN` is where the dev server proxies `/api/v1` and the WebSocket to. `yarn start` uses `proxy.conf.json`, which assumes a gateway on `localhost:3002`; `proxy.hostdocker.js` exists for the common case of running the suite in a container (or a VM) that reaches the host's Guardian stack through `host.docker.internal`.
- Pass `CYPRESS_baseUrl=http://127.0.0.1:4200` to the Cypress run (the `entrypoint.sh` examples above do this).
- The `[proxy]` lines the logger in `proxy.hostdocker.js` prints are the only request-level trace of a UI run — the Angular dev server does not log proxied requests even at `logLevel: "debug"`. See [Diagnosing a hung request](#diagnosing-a-hung-request-ui-runs).
- If a suite keeps hitting odd bootstrap states (page stuck on a spinner even after the tests reload it), restart `ng serve` before re-running: a long-lived dev server accumulates state (stale incremental builds, dead WebSocket pairings) that a fresh one does not have.

##### UI suite patterns (idempotent re-runs)

`ui`-tagged specs drive the real frontend in a persistent browser profile, and the backend state they create (users, tools, policies, tokens) survives the run. Suites 00–02 are idempotent — every spec passes on repeated runs against the same workspace; suite 03 uses the same per-run naming isolation; 04 and later are not converted yet. The patterns they share, worth knowing before extending a UI suite, live in `cypress/support/` and `ui-tests/pages/`:

- **Clean boot** (`homePage.js` → `visit()`): the profile persists `accessToken` and `refreshToken` in `localStorage` (the app reads the username from the access token), so a failed run would auto-log the next one in and skip the login page the Sign Up / login flows depend on. `visit()` wipes those keys in `onBeforeLoad`, then waits for the app shell's loader to release before the first assertion.
- **Settled-phase waits** (`homePage.js` → `_settledUserProfilePhase()`): the user-profile view flashes through several render states as its first load settles, so a one-shot read mis-branches. The helper polls with a real timer until a terminal state (`wizard` or `ready`) has *held* for a short while, resolves with the settled phase, and rejects with the last phase seen on the deadline, so a stuck load fails loudly instead of hanging. The same idiom backs the Sign Up settle wait in `ensureAccount`, which always ends logged out on a known state.
- **Task round trips** (`importFlow.js` → `waitForTaskRoundtrip()`): import, create, publish and dry-run actions run as backend tasks — the app navigates to `/task/:id` and redirects back on completion, and lists do not refresh on their own. Flows wait for the full round trip, then re-land with a fresh `cy.visit`.
- **Import-preview tool checks** (`importFlow.js` → `settleToolRowChecks()` / `replaceInaccessibleTools()`): a preview row settles to valid/invalid when its per-row check request answers, but that request has no client-side timeout — one check the gateway never answers pins its row at `load`, which keeps the Import button disabled forever. The helper waits with a deadline, re-issues the checks for rows still loading (the row's change handler re-runs them), and after the last attempt fails the test with the stuck `messageIds`. Rows pointing at tool messages this gateway cannot resolve are re-pointed at the same-named workspace tool through the row's search picker — and the picker only lists *published* tools, which is why `toolsPage.js` → `ensureToolPublished()` imports the Methodology Library tools and publishes them on demand first (published ones are left alone, drafts are published, missing ones imported).
- **Background-window visibility** (`homePage.js` → `logOut()`): `getClientRects()` and `getBoundingClientRect()` can report zero for genuinely rendered elements in the backgrounded electron window, so branch signals must be DOM presence, not layout metrics. The new header renders the sign-out icon and the hover flyout in mutually exclusive `@if` states (and the flyout only shows on a real `:hover` a test cannot produce), so `logOut()` branches on which of the two is in the DOM and expands a collapsed menu first rather than trying to hover it.
- **Wizard navigation without position assumptions** (`wizardSteps.js`): a policy opens on whichever step the viewer last visited for that user, and step bodies may contain nested tab containers. `clickButtonInWizardSteps` probes the visible step body for the control, then walks the visible tabs, then the step items — throwing a listing of everything it explored when the control is nowhere — and `clickWizardTab` steers a flow to a named tab.
- **Dialogs drop keystrokes while they re-render** (tag create, contract import, token edit): `type()` into such a field can lose characters, so set the value in one step with `cy.get(sel).invoke('val', value).trigger('input')` and assert it with `should('have.value', value)`.
- **Row action icons have `pointer-events: none`**: click their wrapper (`div.guardian-icon-button`, `.select-menu-item`), not the icon.
- **The request form is a sectioned wizard** (`userPoliciesPage.js`): it opens on an overview, so start with `openOverviewSection()` (Start, or Continue when answers are pending), then find fields by their label (`.sf-label-text`). `answerMissingFields()` follows the footer's "Jump to next missing" link. A required repeating entry counts as one answer, so the link lands on its card without focusing a field; the helper then opens the entries (Edit) and their cards and fills what is invalid inside. A date picker stays open over the fields below it until Escape closes it.
- **Lists filter client-side on the loaded page**, and modules and tokens list newest first.

Product bugs surfaced while making the suites idempotent are documented in [`pending-issues/`](pending-issues/), one file per issue.

##### Run smoke tests

```bash
npx cypress run --env "grepTags=smoke,grepFilterSpecs=true"
```

#### Running Tests with Tags

Tags allow you to run specific test subsets. For local CLI runs using `--env "grepTags=..."`, pass multiple tags as a **space-separated** list. For Docker runs, `CYPRESS_grepTags` accepts both spaces and commas (the entrypoint normalizes them).

Tests are tagged on the Mocha context object: `context('...', { tags: ['ui', 'smoke'] }, ...)`. A tag on the context covers every test in it; there is no per-`it()` tagging in this suite, and title-text `@tag` markers are not matched.

##### Verified tag examples

**All API tests (basic run):**

```bash
npx cypress run --browser chrome --env "grepTags=api-all,grepFilterSpecs=true"
```

**Sanity run (preparing + specific feature, e.g. policies):**

```bash
npx cypress run --browser chrome --headed --env "grepTags=preparing policies,grepFilterSpecs=true"
```

##### Single Tag

```bash
npx cypress run --browser chrome --env "grepTags=accounts,grepFilterSpecs=true"
```

##### Multiple Tags (OR operation)

Tags separated by spaces select the specs that have **any** of them:

```bash
npx cypress run --browser chrome --env "grepTags=preparing policies,grepFilterSpecs=true"
```

To select only the specs that have **every** tag, join them with `+` (`grepTags=policies+smoke`).

**Important**:

- **Local CLI (`--env "..."`)**: use spaces, e.g. `preparing policies`. A comma separates two `--env` entries, so `grepTags=preparing,policies` is not a tag list
- **Docker (`CYPRESS_grepTags=...`)**: spaces or commas are accepted, e.g. `preparing policies` or `preparing,policies`

##### Available Tags

**Feature Tags:**

- `accounts` - all tests for accounts operations
- `analytics` - all tests for analytics operations
- `artifacts` - all tests for artifacts operations
- `contracts` - all tests for contracts operations
- `demo` - all tests for demo operations
- `external` - all tests for external operations
- `ipfs` - all tests for IPFS operations
- `logs` - all tests for log operations
- `modules` - all tests for modules operations
- `policies` - all tests for policies operations
- `profiles` - all tests for profiles operations
- `schemas` - all tests for schemas operations
- `settings` - all tests for settings operations
- `tags` - all tests for tags operations
- `tokens` - all tests for tokens operations
- `trustchains` - all tests for trustchains operations
- `worker` - all tests for workers tasks logging operations
- `themes` - all tests for operations with themes
- `branding` - all tests for operations with branding
- `notifications` - all tests for operations with notifications
- `wizard` - all tests for operations with policy wizard
- `permissions` - all tests for operations with permissions
- `formulas` - all tests for operations with formulas
- `policy_labels` - all tests for operations with policy labels
- `remote_policy` - all tests for remote policy feature (using MGS)

**General Tags:**

- `all` - every test: API, policy, UI and disaster recovery, except the specs that do not carry it (`009_policies/VM033.cy.js`, tagged `VM0033`, and the `017_indexer` specs). It needs the frontend, so the CI starts it whenever the tags select a UI test
- `api-all` - all API tests
- `policy-all` - all policy tests (CDM and iREC; `policyAT` selects the same specs)
- `ui-all` - all UI tests
- `dr-all` - the disaster-recovery test (needs direct access to MongoDB, see `mongoUrl`)
- `all-no-mgs` - every test except the ones that need MGS
- `preparing` - special test used for generating accounts for tests (should be run before feature-specific tests)
- `smoke` - all tests for the most important and frequently used functionality
- `ui` - all UI tests

**Note**: When running tests using certain tags, additional tests may be executed to ensure successful test run. Always include the `preparing` tag when running feature-specific tests to ensure user accounts are created.

### Docker Setup

#### Overview

The e2e-tests directory includes Docker setup for containerized test execution with a single Docker image definition:

1. **Dockerfile** - Installs Chromium and defaults to `CYPRESS_BROWSER=chromium` for CI and local Docker runs.

#### Building the Docker Image

```bash
cd e2e-tests
docker compose build
```

The `docker-compose.yml` uses `Dockerfile` and sets `CYPRESS_BROWSER=chromium`.

#### Running Tests in Docker

Ensure Guardian is running and reachable (e.g. API on port 3002). From the repo root, build the image once, then run with the desired tags.

##### Sanity tests (preparing + policies; common smoke/sanity run)

```bash
cd e2e-tests
docker-compose build
CYPRESS_grepTags="preparing policies" CYPRESS_grepFilterSpecs=true docker-compose up
```

##### Smoke tests only

```bash
cd e2e-tests
CYPRESS_grepTags="smoke" CYPRESS_grepFilterSpecs=true docker-compose up
```

##### All API tests

```bash
cd e2e-tests
CYPRESS_grepTags=all CYPRESS_grepFilterSpecs=true docker-compose up
```

> Note: when running API tests in Docker, we target the API gateway directly at `:3002` (no `/api/v1` prefix).
> If you point Cypress at `http://...:3002/api/v1/...` you’ll get 404s (the Angular `:4200/api/v1` proxy normally rewrites that prefix away).

##### Recommended (one-shot) Docker Compose runs

Prefer `docker compose run --rm` for test jobs (it exits cleanly and doesn’t leave long-lived containers).

```bash
cd e2e-tests
docker compose build
docker compose run --rm cypress-api
```

Run a smaller suite:

```bash
cd e2e-tests
docker compose run --rm cypress-api --spec "cypress/e2e/api-tests/000_accounts_tests/*.cy.js"
```

Sanity (multi-tag):

```bash
cd e2e-tests
CYPRESS_grepTags="preparing policies" CYPRESS_grepFilterSpecs=true docker compose run --rm cypress-api
```

Smoke:

```bash
cd e2e-tests
CYPRESS_grepTags="smoke" CYPRESS_grepFilterSpecs=true docker compose run --rm cypress-api
```

UI tests (requires UI server reachable from Docker; set `CYPRESS_UI_BASEURL`):

```bash
cd e2e-tests
CYPRESS_UI_BASEURL=http://host.docker.internal:4200 docker compose run --rm cypress-tests --spec "cypress/e2e/ui-tests/specs/**/*.cy.js"
```

UI tests (no host binding tweaks): run the UI inside Docker (frontend runs in `ui` service). This still expects the **API gateway** to be reachable from Docker (default: `host.docker.internal:3002`). If needed, set `UI_GATEWAY_HOST` / `UI_GATEWAY_PORT`.

```bash
cd e2e-tests
docker compose run --rm --build cypress-ui
```

If the `ui` container crashes on startup with Nginx errors, make sure these variables are set (they’re required by the `frontend-demo` image template):

- `UI_MRV_SENDER_HOST` / `UI_MRV_SENDER_PORT` (defaults: `host.docker.internal:3005`)
- `UI_TOPIC_VIEWER_HOST` / `UI_TOPIC_VIEWER_PORT` (defaults: `host.docker.internal:3006`)

UI tests (small 3-spec suite):

```bash
cd e2e-tests
docker compose run --rm --build cypress-ui --spec "cypress/e2e/ui-tests/specs/01_administration/status.cy.js,cypress/e2e/ui-tests/specs/01_administration/logs.cy.js,cypress/e2e/ui-tests/specs/01_administration/settings.cy.js"
```

UI smoke (small suite by tags, no `--spec`):

```bash
cd e2e-tests
CYPRESS_grepTags="ui smoke" CYPRESS_grepFilterSpecs=true docker compose run --rm --build cypress-ui
```

##### Using raw Docker (from repo root)

```bash
docker build -t cypress-runner ./e2e-tests
# Sanity:
docker run --rm --network host -e CYPRESS_portApi=3002 -e CYPRESS_grepTags="preparing policies" -e CYPRESS_grepFilterSpecs=true cypress-runner
# Smoke:
docker run --rm --network host -e CYPRESS_portApi=3002 -e CYPRESS_grepTags="smoke" -e CYPRESS_grepFilterSpecs=true cypress-runner
```

##### With custom authentication

```bash
cd e2e-tests
CYPRESS_grepTags="preparing policies" \
CYPRESS_grepFilterSpecs=true \
CYPRESS_operatorId= \
CYPRESS_operatorKey= \
docker-compose up
```

##### Using raw Docker command

```bash
docker run --network host --name cypress-test-run \
  -e CYPRESS_portApi=3002 \
  -e CYPRESS_apiServer=http://host.docker.internal:3002/ \
  -e CYPRESS_grepTags="all" \
  -e CYPRESS_grepFilterSpecs=true \
  cypress-runner
```

#### Docker Environment Variables

When running Docker tests, most variables are prefixed with `CYPRESS_` (the report title override uses `ReportName`):

| Variable | Default | Description |
| ---------- | --------- | ------------- |
| CYPRESS_portApi | 3002 | Guardian API port (direct API gateway). For local runs via the Angular proxy, this is typically `4200/api/v1` |
| CYPRESS_baseUrl | - | Base URL for UI tests. When using `docker compose run cypress-tests`, set `CYPRESS_UI_BASEURL` (it maps to `CYPRESS_baseUrl`) e.g. `http://host.docker.internal:4200`. When using `docker compose run cypress-ui`, it is set automatically to `http://ui`. |
| CYPRESS_grepTags | all | Tag filter; for multiple tags use spaces (e.g. `preparing policies`). Commas are also accepted. |
| CYPRESS_grepFilterSpecs | true | Enable tag filtering |
| CYPRESS_operatorId | - | Hedera operator ID. Required by the `settings` specs; no value is bundled in `cypress.env.json`. Falls back to `OPERATOR_ID`. |
| CYPRESS_operatorKey | - | Hedera operator key. Required by the `settings` specs; no value is bundled in `cypress.env.json`. Falls back to `OPERATOR_KEY`. |
| CYPRESS_ipfsStorageApiKey | - | IPFS storage API key sent by the `settings` specs. Falls back to `IPFS_STORAGE_API_KEY`, then to a placeholder – the value is unused while `IPFS_PROVIDER=local`. |
| CYPRESS_hederaNet | testnet | Which Hedera network the Guardian stack under test is on. Anything other than `testnet` makes the suite publish its own Hedera artefacts instead of importing the testnet messages pinned in `cypress.env.json`. Falls back to `HEDERA_NET`. See [Running against a local Hiero network](#running-against-a-local-hiero-network). |
| CYPRESS_BROWSER | chromium | Browser: `chromium`, `electron`, or `firefox` (must exist in the image) |
| CYPRESS_apiServer | - | Optional full API origin override (useful on Docker Desktop). Examples: `http://host.docker.internal:3002/` (direct API gateway) or `http://host.docker.internal:4200/api/v1/` (if using Angular proxy) |
| CYPRESS_SPEC | `cypress/e2e/api-tests/**/*.cy.js` in `cypress-api` | Optional default spec pattern used by the Docker entrypoint when `--spec` is not provided |
| CYPRESS_API_WAIT_TIMEOUT | 60 | API readiness wait timeout (seconds) |
| CYPRESS_API_WAIT_INTERVAL | 2 | API readiness wait interval (seconds) |
| CYPRESS_UI_WAIT_TIMEOUT | 90 | UI readiness wait timeout (seconds), used when `CYPRESS_baseUrl` is set |
| CYPRESS_UI_WAIT_INTERVAL | 2 | UI readiness wait interval (seconds), used when `CYPRESS_baseUrl` is set |
| ReportName | Guardian's Cypress Report | Optional Mochawesome report title (used by `reporter-config.js`) |

#### Configuration File

Create `.env` file in the e2e-tests directory for persistent environment variables:

```bash
## Required for most auth-dependent tests (choose one style):
OPERATOR_ID=
OPERATOR_KEY=

## Optional: only for MGS/remote-policy scenarios
CYPRESS_MGSAdmin=
CYPRESS_MGSIndexerAPIToken=

## Optional: report title override
ReportName="Guardian's Cypress Report"

## Optional: override API/UI targets (defaults usually work)
## CYPRESS_apiServer=http://host.docker.internal:3002/
## CYPRESS_baseUrl=http://host.docker.internal:4200

## Optional: test selection
## CYPRESS_grepTags=smoke
## CYPRESS_grepFilterSpecs=true
## CYPRESS_SPEC=cypress/e2e/api-tests/**/*.cy.js
```

The `.env` file is automatically loaded by docker compose. Keeping `.env` mostly empty is fine; only set values you need for your run.

Variable precedence for `docker compose run`:

- Inline values in command (`VAR=value docker compose run ...`) win over everything.
- Then `.env` values are used.
- Then defaults from `docker-compose.yml` apply.

Important caveat for `CYPRESS_baseUrl`:

- In `cypress-ui`, `CYPRESS_baseUrl` is set to `http://ui` in `docker-compose.yml`.
- In `cypress-api`, `CYPRESS_baseUrl` is set to empty in `docker-compose.yml`.
- Because these are explicitly set by service config, a `.env` value for `CYPRESS_baseUrl` may not be applied for those services.
- If you need a different base URL for UI tests, pass it inline for the command or run local (non-Docker) Cypress with `CYPRESS_baseUrl=...`.

When running `docker compose` from `e2e-tests/`, we also load `../guardian-service/configs/.env.guardian`, so `OPERATOR_ID` / `OPERATOR_KEY` can be picked up automatically (they’re mapped to `operatorId` / `operatorKey` inside `entrypoint.sh`).

Parameter summary:

- **Mandatory (typical runs):** `OPERATOR_ID` + `OPERATOR_KEY` (or `CYPRESS_operatorId` + `CYPRESS_operatorKey`). No operator credentials are committed to `cypress.env.json`, so the `settings` specs fail without them. This is the only Hedera account the suite needs – specs that require their own funded account request one at runtime via `cy.getHederaKeys()` (`GET /demo/random-key`).
- **Mandatory only for MGS/remote-policy tests:** `CYPRESS_MGSAdmin` + `CYPRESS_MGSIndexerAPIToken`.
- **Optional:** `ReportName`, `CYPRESS_apiServer`, `CYPRESS_baseUrl`, `CYPRESS_grepTags`, `CYPRESS_grepFilterSpecs`, `CYPRESS_SPEC`.

#### Windows (Docker) quick run

Use PowerShell syntax for env vars:

API smoke run:

```powershell
cd e2e-tests
$env:CYPRESS_grepTags="smoke"
$env:CYPRESS_grepFilterSpecs="true"
docker compose run --rm --build cypress-api
```

UI smoke run:

```powershell
cd e2e-tests
$env:CYPRESS_grepTags="ui smoke"
$env:CYPRESS_grepFilterSpecs="true"
docker compose run --rm --build cypress-ui
```

Run only 2-3 API specs:

```powershell
cd e2e-tests
docker compose run --rm --build cypress-api --spec "cypress/e2e/api-tests/000_accounts_tests/postLogin.cy.js,cypress/e2e/api-tests/000_accounts_tests/getSession.cy.js,cypress/e2e/api-tests/000_accounts_tests/getBalance.cy.js"
```

Run only 2-3 UI specs:

```powershell
cd e2e-tests
docker compose run --rm --build cypress-ui --spec "cypress/e2e/ui-tests/specs/01_administration/status.cy.js,cypress/e2e/ui-tests/specs/01_administration/logs.cy.js,cypress/e2e/ui-tests/specs/01_administration/settings.cy.js"
```

If needed, clear temporary env vars in the same shell:

```powershell
Remove-Item Env:CYPRESS_grepTags
Remove-Item Env:CYPRESS_grepFilterSpecs
```

#### Available Browsers in Docker

- **Chromium** (default via `CYPRESS_BROWSER=chromium`) - Full browser, typical CI path
- **Electron** - Lightweight, fast fallback
- **Firefox** - Alternative browser option (use: --browser firefox)

#### Switching Browsers

Set `CYPRESS_BROWSER`; the browser must be installed in the image:

```bash
CYPRESS_BROWSER=chromium docker-compose up
CYPRESS_BROWSER=electron docker run ... 
```

#### Extracting Test Results from Docker

After running tests in Docker, results are automatically available in:

```bash
ls -la cypress/reports/html/
ls -la cypress/test_results/junit/
```

These directories are mounted as volumes from the Docker container to your local machine.

### Running against a local Hiero network

The suite defaults to Hedera testnet, and nothing below is needed for that. A local network is worth the setup when you want to run the whole suite without spending testnet HBAR, without waiting on real consensus and mirror-node indexing, or on a ledger that starts empty every time. It is what the E2E Tests and UI Tests workflows (through the reusable `.github/workflows/e2e-run.yml`) do on every run, using `hiero-ledger/hiero-solo-action`.

#### The `hederaNet` parameter

`hederaNet` tells the suite which network the Guardian stack under test is on. It defaults to `testnet` in `cypress.env.json`, so an existing invocation keeps behaving exactly as it does today.

Two things change when it is set to anything else:

- `006_settings/getSettingsEnv` asserts that `GET /settings/environment` reports that network.
- `000_accounts_creating/seedHederaArtefacts` runs. `cypress.env.json` pins Hedera message IDs that
  were published on testnet and resolve nowhere else, so that spec publishes the same artefacts from local fixtures and records the resulting message IDs in `cypress/fixtures/seededMessages.json`. Every consuming spec asks `seededMessageId(<key>)` (`cypress/support/CustomHelpers/ipfsSeeding.js`) for the ID and stays network-agnostic; that resolver is the only place the branch lives.

  The seven seeded keys are `irec_policy`, `policy_with_artifacts`, `policy_for_compare1/2`, `module_for_import` and `tool_for_compare1/2`. Two more are pinned but not seeded: `schema_for_import`, which only a UI spec uses, and `contract_for_import`, which no spec references at all.

`entrypoint.sh` back-fills `CYPRESS_hederaNet` from a bare `HEDERA_NET`, so pointing the suite at a stack you started with `HEDERA_NET=localnode` needs no extra flag:

```bash
# testnet, unchanged
CYPRESS_grepTags="smoke" npx cypress run

# local Hiero network, native
CYPRESS_hederaNet=localnode CYPRESS_grepTags="smoke" ./entrypoint.sh

# local Hiero network, dockerized
CYPRESS_hederaNet=localnode CYPRESS_grepTags="smoke" docker compose run --rm cypress-api
```

#### Bringing the network up with Solo

[Solo](https://solo.hiero.org) provisions a single-node Hiero network on Kubernetes-in-Docker. You need Docker, `kind`, `kubectl` and Node 22 or newer; one script does the rest:

```bash
cd e2e-tests
npm run solo:up
```

`solo:up` runs `solo one-shot single deploy --minimal-setup`, waits until the consensus node and the mirror REST API answer, and creates the operator: an ED25519 account with 50,000,000 HBAR, funded by the genesis account, since one-shot only predefines ECDSA accounts. It then compiles `contracts/`, uploads their bytecode, and writes everything Guardian needs to `e2e-tests/.solo/solo.env`. Solo is pinned (see `SOLO_VERSION` in `scripts/solo-network.mjs`) and runs through `npx`, with its state in `e2e-tests/.solo/home`, so a globally installed Solo and `~/.solo` are never touched.

Behind a TLS-intercepting proxy (for example Zscaler) image pulls inside the kind node fail with `x509: certificate signed by unknown authority`. Set `SOLO_EXTRA_CA_CERT` to the PEM bundle of the proxy CA and `solo:up` installs it in the node before Solo creates any pod:

```bash
SOLO_EXTRA_CA_CERT=/path/to/proxy-ca.pem npm run solo:up
```

When you are done:

```bash
npm run solo:down
```

It destroys the deployment, deletes the `solo-cluster` kind cluster and removes `e2e-tests/.solo/`.

The network is published on `127.0.0.1:35211` (consensus node, account `0.0.3`) and `127.0.0.1:38081` (mirror node REST API). These are not the ports Guardian's `localnode` mode assumes (`:50211` and `:5551`, `common/src/helpers/environment.ts`), so `solo.env` points Guardian at them with `OVERRIDE_NETWORK_CONFIGURATION`, `OVERRIDE_HEDERA_CONSENSUS_NODES` and `OVERRIDE_HEDERA_MIRROR_NODES`. `guardian-service`, `policy-service` and `topic-listener-service` all apply them, as does `.github/scripts/upload-contract-bytecode.mjs`.

#### Contract bytecode

`guardian-service` deploys the retire/wipe contracts from Hedera File IDs, and the ones shipped in `configs/.env..guardian.system` are testnet files that a fresh network does not have; without replacing them every spec in `013_contracts/` fails on the first deploy. `solo:up` compiles `contracts/` and runs `.github/scripts/upload-contract-bytecode.mjs` for you, and the four `*_FILE_ID` variables end up in `solo.env`.

#### Pointing Guardian at it

To run Guardian natively and the suite against it, the way the workflow does, use the `e2e-tests` scripts. `guardian:build` installs the Guardian workspace with the Yarn release vendored in `.yarn/releases` and runs the workflow's build step; pass package names (`npm run guardian:build -- @guardian/interfaces`) to build only those. Run it before `solo:up`, which uploads the contract bytecode with the workspace's Hedera SDK:

```bash
cd e2e-tests
npm ci                       # the test dependencies
npm run guardian:build       # the Guardian workspace and the packages the stack runs
npm run solo:up              # the network, once
npm run guardian:up          # MongoDB, NATS, Valkey and Kubo containers, then every Guardian service
npm run guardian:status      # checks the network, the infra and every service
npm run guardian:test        # the whole suite
npm run guardian:test:smoke  # only the tests tagged smoke
npm run guardian:test -- cypress/e2e/api-tests/001_demo/getRandomKey.cy.js   # a single spec
npm run guardian:test -- 'cypress/e2e/api-tests/010_tokens/*.cy.js' cypress/e2e/api-tests/001_demo/getRandomKey.cy.js   # several specs or globs
npm run guardian:stop-policies   # stops the policy processes, see the Quickstart
npm run guardian:down        # stops the services and removes the containers
```

`guardian:test` accepts any number of specs after `--`, each a file or a glob (`*` and `**` work, as in the default pattern `cypress/e2e/api-tests/**/*.cy.js`), or one comma-separated list. Quote the globs, so that Cypress expands them rather than your shell. Specs that need users or seeded artefacts rely on `000_accounts_creating/create_accounts.cy.js` and, on a local network, `000_accounts_creating/seedHederaArtefacts.cy.js`, which run first in a full run; include them when you run a spec on a freshly started stack.

`guardian:test` always filters on the `all` tag, also when it is given specs: a spec without that tag (`009_policies/VM033.cy.js`, the `017_indexer` specs) is left out, and a run of only such specs ends with "Can't run because no spec files were found". Run those with `npx cypress run --spec <file>`, or with `entrypoint.sh` and `CYPRESS_grepTags` set to one of their tags.

`scripts/local-guardian.sh` loads `.solo/solo.env` for you and takes the JWT keys from `configs/.env.quickstart.guardian.system`, so nothing has to be configured. Service logs and the pids of the services it started are in `e2e-tests/.local/logs`. The infra containers are recreated on every `guardian:up`, because the ledger is empty after each `solo:up` and an older database would point at accounts that no longer exist. Stop a running `guardian-quickstart` first: they use the same ports.

To start the services yourself instead, load the variables in every shell that starts one, and in the one that runs the suite:

```bash
set -a; source e2e-tests/.solo/solo.env; set +a
cd e2e-tests && CYPRESS_grepTags="smoke" ./entrypoint.sh
```

`entrypoint.sh` back-fills `CYPRESS_hederaNet`, `CYPRESS_operatorId` and `CYPRESS_operatorKey` from `HEDERA_NET`, `OPERATOR_ID` and `OPERATOR_KEY`.

For the docker compose stack, `configs/.env.localnode.guardian.system` is the ecosystem env file: fill in `OPERATOR_ID`, `OPERATOR_KEY` and the four `*_FILE_ID` variables from `solo.env`, then:

```bash
GUARDIAN_ENV=localnode docker compose up
```

The services run in containers there, so `LOCALNODE_ADDRESS` and the `OVERRIDE_*` addresses use `host.docker.internal` rather than `127.0.0.1`, and on Linux that also needs `extra_hosts: ["host.docker.internal:host-gateway"]` on every Guardian service, which the root `docker-compose*.yml` do not declare. Running the services natively has no such problem.

### CI/CD Integration

#### GitHub Actions Workflows

Three workflows run the suites, all on the same stack definition:

| Workflow | File | Runs |
|---|---|---|
| **E2E Run** | `.github/workflows/e2e-run.yml` | Reusable (`workflow_call`), never triggered on its own. Starts a local Hiero network with Solo, the infrastructure and the Guardian services, optionally the frontend, runs Cypress, and publishes reports. |
| **E2E Tests** | `.github/workflows/e2e-tests.yml` | The API and policy suites: `smoke` on every push, `api-all policy-all` nightly. |
| **UI Tests** | `.github/workflows/ui-manual.yml` | The UI suite plus the disaster-recovery spec (`ui-all dr-all`), nightly and on demand. |

Both callers pass `suite`, `grep_tags`, and optionally `spec`, `with_frontend`, `solo_version` and `timeout_minutes` to `e2e-run.yml`. Anything about how the stack is started changes in `e2e-run.yml` only.

##### Manual Workflow Run

1. Go to **Actions** → **E2E Tests** or **UI Tests**
2. Click **Run workflow**
3. Enter parameters:
   - **Tags**: e.g., `all`, `smoke`, `preparing policies`, `api-all`, `policy-all` for E2E Tests; `ui-all dr-all` (the default) for UI Tests. `all` works in either and runs every test
   - **Spec** (UI Tests only): a spec glob such as `cypress/e2e/ui-tests/specs/02_policies/*.cy.js`. The account seeding specs always run first, because every other spec needs the users and artefacts they create
   - **Solo version**: optional, the Solo release that deploys the local Hiero network

##### Available Input Parameters

- `tags` (E2E Tests default: `smoke`; UI Tests default: `ui-all dr-all`) - Test tags to run. For multiple tags, use spaces (e.g. `policies schemas`) or commas (e.g. `policies,schemas`). In CI, `preparing` is automatically prepended for feature-scoped runs (not for `all`, and not when `ui` is among the tags).
- `spec` (UI Tests only, default: empty) - Narrows the run to a spec glob.
- `solo_version` (default: empty, which uses `SOLO_VERSION` in `e2e-run.yml`) - Solo release passed to `hiero-ledger/hiero-solo-action`.

Scheduled runs happen nightly at 03:00 UTC: E2E Tests runs `api-all policy-all`, UI Tests runs `ui-all dr-all`. Pushes to E2E Tests run `smoke`.

##### Workflow Features

- Starts a local Hiero network with Solo, and uploads the contract bytecode to it
- Builds Guardian services
- Starts MongoDB, NATS, Valkey and Kubo as service containers, and the Guardian services natively
- For UI runs, installs the frontend and serves it with `ng serve` on `127.0.0.1:4200`, proxied to the gateway (`frontend/proxy.hostdocker.js`), the same way as the local recipe in "Preparing the app for UI tests"
- Runs Cypress natively on the runner against that stack
- With the `ui_request_trace` input of a manual run (`UI Tests`, or `E2E Tests` with UI tags), the dev server logs every request it proxies to the gateway (`UI_PROXY_LOG`), into `frontend-1.log` of the Guardian logs artifact. It is for diagnosing a UI failure, and the log is large
- Publishes test results (one check per suite: `Test results · api`, `· policy`, `· ui`)
- Uploads HTML and JSON reports as artifacts, plus the Guardian (frontend included) and Solo logs when a run fails
- Deletes the Solo kind cluster at the end of the run

##### Test Report Artifacts

After workflow completion:

1. Open the run in **Actions** → **Summary**.
2. In the **Artifacts** section, download **`cypress-reports-<suite>-...`** (contains the full report tree, including `html/` and `html/.jsons`).
3. Unzip and open `html/index.html` in a browser to view the interactive Cypress report (test details, screenshots, etc.).
4. **Published results** – JUnit results are also published to the workflow summary.

### Test Reports

#### Local Test Reports

After running tests locally, find reports in:

```text
cypress/
  ├── reports/
  │   └── html/
  │       └── index.html          # Interactive HTML report
  ├── test_results/
  │   └── junit/
  │       └── [hash].xml          # JUnit format for CI integration
  └── screenshots/                # Failed test screenshots
```

Open `cypress/reports/html/index.html` in your browser to view the detailed test report.

#### Docker Test Reports

To access reports from Docker runs:

1. Copy reports from container:

```bash
docker cp cypress-test-run:/e2e/cypress/reports ./e2e-tests/cypress/reports
```

1. Open `cypress/reports/html/index.html` in your browser

#### Report Contents

The HTML report includes:

- Test execution summary (passed, failed, skipped)
- Individual test details
- Video recordings of failed tests
- Screenshots from failures
- Test duration and timing
- Detailed error messages and stack traces

### Common Usage Patterns

#### Pattern 1: Basic API Test Run

```bash
npm ci
npx cypress run --browser chrome --env "grepTags=all,grepFilterSpecs=true"
```

#### Pattern 2: Sanity Testing (Prepare Users + Run Policies Tests)

```bash
npx cypress run --browser chrome --headed --env "grepTags=preparing policies,grepFilterSpecs=true"
```

#### Pattern 3: Docker-based Full Test Suite

```bash
docker build -t cypress-runner ./e2e-tests
docker run --network host \
  -e CYPRESS_portApi=3002 \
  -e CYPRESS_grepTags="all" \
  -e CYPRESS_grepFilterSpecs=true \
  cypress-runner
```

#### Pattern 4: Running Multiple Feature Tags

```bash
npx cypress run --browser chrome --env "grepTags=preparing policies schemas artifacts,grepFilterSpecs=true"
```

### Troubleshooting

#### --env and "Cannot parse as valid JSON"

Cypress reads `--env` as `key=value` pairs separated by commas, and falls back to JSON when a part is not a pair. A comma between two tags makes such a part (in `--env "grepTags=all,policies,grepFilterSpecs=true"`, `policies` is not a pair), so Cypress stops with **"Cannot parse as valid JSON"**. Separate the tags with spaces, or pass a JSON object:

```bash
npx cypress run --browser chrome --env "grepTags=preparing policies,grepFilterSpecs=true"
npx cypress run --browser chrome --env '{"grepTags":"preparing policies","grepFilterSpecs":true}'
```

`CYPRESS_grepTags` (Docker, `entrypoint.sh`) is not parsed that way: there, commas and spaces both separate tags.

#### Common Issues

##### No Tests Found

- Verify tags are spelled correctly (see [Available Tags](#available-tags)).
- Tests are tagged on the **Mocha context object**, e.g. `context('...', { tags: ['ui'] }, ...)`. `@cypress/grep` reads the tags from the context object; `@tag` markers in a test *title* are not picked up, so a title like `it('@ui ...')` will not be selected by `grepTags=ui`.
- Check that `grepFilterSpecs=true` is set: without it every spec file is loaded and the tags only filter the tests inside each file, which for a whole suite is slow and muddies the "no tests found" signal.

##### Diagnosing a hung request (UI runs)

Start the app with the `proxy.hostdocker.js` logger (see [Preparing the app for UI tests](#preparing-the-app-for-ui-tests)). It traces every request the app makes to the backend on stderr:

```
[proxy] GET /profiles/StandardRegistry (auth)
[proxy] GET /profiles/StandardRegistry <- 200
[proxy] POST /accounts/login (NO-AUTH)
```

- `(auth)` / `(NO-AUTH)` is the presence of the `Authorization` header, so a tokenless call stands out.
- A request that is logged as sent but **never gets a `<- <status>` line** was accepted by the gateway and is still open. In the UI this shows as a page stuck on a spinner.
- `WS-UPGRADE` lines without a follow-up indicate the WebSocket was accepted but never used by the app.

##### The services run old code after a pull

`npm start` runs each service from `dist/`, so a stale build silently runs the previous code. Rebuild with `npx tsc -p .` in `interfaces`, `common` and `hedera`, in this order, then in every service, and restart the services (`npm run guardian:services:down` and `up`). A stale `hedera` package is easy to miss: `policy-service` then fails with `createUnsignedCredential` missing on `VcHelper`, which lives in `hedera`, not `common`.

##### Cypress behaviours that look like bugs

- `.should('be.visible', { timeout })` ignores the timeout, because assertion options are not command options: put the timeout on the `cy.get` or `cy.contains`.
- A `cy.request` that sends a binary body (a Blob) yields the response body as an `ArrayBuffer` from another realm, even for a JSON response, so `instanceof ArrayBuffer` is false. Check `byteLength` instead, as `decodeBody` in `support/cdmTools.js` does.
- A `Cypress.on('fail')` handler can fire more than once (retries), so it must be idempotent, and `cy.writeFile` throws inside it.
- List endpoints are paginated with `pageIndex` and `pageSize`; there is no `page` parameter.

##### Docker Connection Issues

- Use `--network host` for Docker to access localhost services
- Verify Guardian services are running on expected ports
- Check firewall settings

##### Missing Test Results

- Verify Docker volume mounts are correct
- Ensure output directories exist in container
- Check Docker `cp` command paths

##### Insufficient Balance Errors

- Ensure Hedera operator account has sufficient balance
- For CI runs, verify secrets are properly configured

#### Debug Mode

To run tests with more verbose output:

```bash
npx cypress run --browser chrome --env "grepTags=all,grepFilterSpecs=true" --headed
```

### Screenshots

After launching the tests, a folder `cypress/screenshots` will be generated. Inside you can find the screenshots for failures of UI tests.
