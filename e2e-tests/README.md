# Guardian E2E Tests suites

The `/e2e-tests` folder comprises the Guardian Cypress test automation framework and automated UI and API tests runnable on the local machine or via Docker.

Unless specified otherwise, the tests are idempotent and can be run multiple times without side effects, and in any order.
The only requirement is preparing the environment with a few accounts using the `preparing` tag, and ensuring the accounts have enough balance for the operations performed during the tests (especially the StandardRegistry):

```bash
export CYPRESS_portApi=3000/api/v1
TAG=preparing ./run-test-by-tag.sh
```

See [Running Tests with Tags](#running-tests-with-tags) below for more details.

## Guardian E2E (Docker)

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

## Guardian Local Machine (Non-Docker)

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

- Node.js 20 and above
- Docker and Docker Compose (for Docker-based test execution)
- Follow steps from the [README](https://github.com/hashgraph/guardian/blob/main/README.md) to install and deploy the Guardian application.

### Installation

#### Manual Setup

From the `/e2e-tests` folder, run the following command to install Cypress:

```bash
npm install cypress
```

### Configuration

#### Environment Variables

If you built the Guardian in Docker, set the `portApi` variable in `cypress.env.json` file. The configuration supports the following variables:

- `portApi` - API port (default: `4200/api/v1`)
- `baseUrl` - Base URL for the application (default: `http://localhost:4200`)
- `operatorId` - Hedera operator ID (empty by default – must be supplied)
- `operatorKey` - Hedera operator key (empty by default – must be supplied)
- `ipfsStorageApiKey` - IPFS storage API key (empty by default; only needed for a non-local `IPFS_PROVIDER`)
- `MGSAdmin` - MGS tenant name
- `MGSIndexerAPIToken` - MGS Indexer API token

### Usage

#### Interactive Dashboard

To run a specific test from the UI, you can open the Cypress dashboard:

```bash
npx cypress open
```

#### Local Command Line Execution

The project pins Cypress 14.x (`package.json`). If you use **Cypress 15+**, `--env` requires **JSON** (see [Cypress 15 and --env](#cypress-15-and---env) below).

##### Run all API tests (most basic)

```bash
npx cypress run --browser chrome --env "grepTags=all,grepFilterSpecs=true"
```

##### Run with specific tags (sanity testing with user preparation)

```bash
npx cypress run --browser chrome --headed --env "grepTags=preparing policies,grepFilterSpecs=true"
```

**Cypress 15+ only** (if you see "Cannot parse as valid JSON"):

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

##### Run smoke tests

```bash
npx cypress run --env "grepTags=smoke,grepFilterSpecs=true"
```

#### Running Tests with Tags

Tags allow you to run specific test subsets. For local CLI runs using `--env "grepTags=..."`, pass multiple tags as a **space-separated** list. For Docker runs, `CYPRESS_grepTags` accepts both spaces and commas (the entrypoint normalizes them).

##### Verified tag examples

**All API tests (basic run):**

```bash
npx cypress run --browser chrome --env "grepTags=all,grepFilterSpecs=true"
```

**Sanity run (preparing + specific feature, e.g. policies):**

```bash
npx cypress run --browser chrome --headed --env "grepTags=preparing policies,grepFilterSpecs=true"
```

**Cypress 15+:** use JSON for `--env`, e.g. `--env '{"grepTags":"preparing policies","grepFilterSpecs":true}'`

##### Single Tag

```bash
npx cypress run --browser chrome --env "grepTags=accounts,grepFilterSpecs=true"
```

##### Multiple Tags (AND operation)

```bash
npx cypress run --browser chrome --env "grepTags=preparing policies,grepFilterSpecs=true"
```

**Important**:

- **Local CLI (`--env "..."`)**: use spaces, e.g. `preparing policies`
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

- `all` - all API tests for Guardian platform
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

The `.env` file is automatically loaded by docker compose.
Keeping `.env` mostly empty is fine; only set values you need for your run.

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

The suite defaults to Hedera testnet, and nothing below is needed for that. A local network is worth
the setup when you want to run the whole suite without spending testnet HBAR, without waiting on real
consensus and mirror-node indexing, or on a ledger that starts empty every time. It is what the
`E2E Tests` workflow (`.github/workflows/e2e-tests.yml`) does on every run, using
`hiero-ledger/hiero-solo-action`.

#### The `hederaNet` parameter

`hederaNet` tells the suite which network the Guardian stack under test is on. It defaults to
`testnet` in `cypress.env.json`, so an existing invocation keeps behaving exactly as it does today.

Two things change when it is set to anything else:

- `006_settings/getSettingsEnv` asserts that `GET /settings/environment` reports that network.
- `000_accounts_creating/seedHederaArtefacts` runs. `cypress.env.json` pins Hedera message IDs that
  were published on testnet and resolve nowhere else, so that spec publishes the same artefacts from
  local fixtures and records the resulting message IDs in `cypress/fixtures/seededMessages.json`.
  Every consuming spec asks `seededMessageId(<key>)`
  (`cypress/support/CustomHelpers/ipfsSeeding.js`) for the ID and stays network-agnostic; that
  resolver is the only place the branch lives.

  The seven seeded keys are `irec_policy`, `policy_with_artifacts`, `policy_for_compare1/2`,
  `module_for_import` and `tool_for_compare1/2`. Two more are pinned but not seeded:
  `schema_for_import`, which only a UI spec uses, and `contract_for_import`, which no spec
  references at all.

`entrypoint.sh` back-fills `CYPRESS_hederaNet` from a bare `HEDERA_NET`, so pointing the suite at a
stack you started with `HEDERA_NET=localnode` needs no extra flag:

```bash
# testnet, unchanged
CYPRESS_grepTags="smoke" npx cypress run

# local Hiero network, native
CYPRESS_hederaNet=localnode CYPRESS_grepTags="smoke" ./entrypoint.sh

# local Hiero network, dockerized
CYPRESS_hederaNet=localnode CYPRESS_grepTags="smoke" docker compose run --rm cypress-api
```

#### Bringing the network up with Solo

[Solo](https://solo.hiero.org) provisions a single-node Hiero network on Kubernetes-in-Docker. You
need Docker, `kind`, `kubectl` and Node 22 or newer; one script does the rest:

```bash
cd e2e-tests
npm run solo:up
```

`solo:up` runs `solo one-shot single deploy --minimal-setup` (a single consensus node and a mirror
node; Solo 0.94 still deploys its explorer and relay with that flag), waits until the consensus node
and the mirror REST API answer, and creates the operator: an ED25519 account with 50,000,000 HBAR,
funded by the genesis account, since one-shot only predefines ECDSA accounts. It then compiles
`contracts/`, uploads their bytecode, and writes everything Guardian needs to
`e2e-tests/.solo/solo.env`. Solo is pinned (see `SOLO_VERSION` in `scripts/solo-network.mjs`) and
runs through `npx`, with its state in `e2e-tests/.solo/home`, so a globally installed Solo and
`~/.solo` are never touched.

Behind a TLS-intercepting proxy (for example Zscaler) image pulls inside the kind node fail with
`x509: certificate signed by unknown authority`. Set `SOLO_EXTRA_CA_CERT` to the PEM bundle of the
proxy CA and `solo:up` installs it in the node before Solo creates any pod:

```bash
SOLO_EXTRA_CA_CERT=/path/to/proxy-ca.pem npm run solo:up
```

When you are done:

```bash
npm run solo:down
```

It destroys the deployment, deletes the `solo-cluster` kind cluster and removes `e2e-tests/.solo/`.

The network is published on `127.0.0.1:35211` (consensus node, account `0.0.3`) and
`127.0.0.1:38081` (mirror node REST API). These are not the ports Guardian's `localnode` mode
assumes (`:50211` and `:5551`, `common/src/helpers/environment.ts`), so `solo.env` points Guardian
at them with `OVERRIDE_NETWORK_CONFIGURATION`, `OVERRIDE_HEDERA_CONSENSUS_NODES` and
`OVERRIDE_HEDERA_MIRROR_NODES`. `guardian-service`, `policy-service` and `topic-listener-service`
all apply them, as does `.github/scripts/upload-contract-bytecode.mjs`.

#### Contract bytecode

`guardian-service` deploys the retire/wipe contracts from Hedera File IDs, and the ones shipped in
`configs/.env..guardian.system` are testnet files that a fresh network does not have; without
replacing them every spec in `013_contracts/` fails on the first deploy. `solo:up` compiles
`contracts/` and runs `.github/scripts/upload-contract-bytecode.mjs` for you, and the four
`*_FILE_ID` variables end up in `solo.env`.

#### Pointing Guardian at it

To run Guardian natively and the suite against it, the way the workflow does, install and build
Guardian once from the repository root (this is the workflow's build step), then use the
`e2e-tests` scripts:

```bash
yarn install --immutable
yarn workspaces foreach -A --topological-dev --parallel --jobs 4 \
  --include '@guardian/interfaces' --include '@guardian/common' --include '@guardian/hedera' \
  --include notification-service --include logger-service --include auth-service \
  --include queue-service --include topic-listener-service --include guardian-service \
  --include policy-service --include worker-service --include api-gateway run build
```

```bash
cd e2e-tests
npm run solo:up              # the network, once
npm run guardian:up          # MongoDB, NATS, Valkey and Kubo containers, then every Guardian service
npm run guardian:test        # the whole suite
npm run guardian:test:smoke  # only the tests tagged smoke
npm run guardian:test -- cypress/e2e/api-tests/001_demo/getRandomKey.cy.js   # a single spec
npm run guardian:test -- 'cypress/e2e/api-tests/010_tokens/*.cy.js' cypress/e2e/api-tests/001_demo/getRandomKey.cy.js   # several specs or globs
npm run guardian:down        # stops the services and removes the containers
```

`guardian:test` accepts any number of specs after `--`, each a file or a glob (`*` and `**` work, as
in the default pattern `cypress/e2e/api-tests/**/*.cy.js`), or one comma-separated list. Quote the
globs, so that Cypress expands them rather than your shell. Specs that need users or seeded
artefacts rely on `000_accounts_creating/create_accounts.cy.js` and, on a local network,
`000_accounts_creating/seedHederaArtefacts.cy.js`, which run first in a full run; include them
when you run a spec on a freshly started stack.

`scripts/local-guardian.sh` loads `.solo/solo.env` for you and takes the JWT keys from
`configs/.env.quickstart.guardian.system`, so nothing has to be configured. Service logs are in
`e2e-tests/.local/logs`. The infra containers are recreated on every `guardian:up`, because the
ledger is empty after each `solo:up` and an older database would point at accounts that no longer
exist. Stop a running `guardian-quickstart` first: they use the same ports.

To start the services yourself instead, load the variables in every shell that starts one, and in
the one that runs the suite:

```bash
set -a; source e2e-tests/.solo/solo.env; set +a
cd e2e-tests && CYPRESS_grepTags="smoke" ./entrypoint.sh
```

`entrypoint.sh` back-fills `CYPRESS_hederaNet`, `CYPRESS_operatorId` and `CYPRESS_operatorKey` from
`HEDERA_NET`, `OPERATOR_ID` and `OPERATOR_KEY`.

For the docker compose stack, `configs/.env.localnode.guardian.system` is the ecosystem env file:
fill in `OPERATOR_ID`, `OPERATOR_KEY` and the four `*_FILE_ID` variables from `solo.env`, then:

```bash
GUARDIAN_ENV=localnode docker compose up
```

The services run in containers there, so `LOCALNODE_ADDRESS` and the `OVERRIDE_*` addresses use
`host.docker.internal` rather than `127.0.0.1`, and on Linux that also needs
`extra_hosts: ["host.docker.internal:host-gateway"]` on every Guardian service, which the root
`docker-compose*.yml` do not declare. Running the services natively has no such problem.

### CI/CD Integration

#### GitHub Actions Workflow

The repository includes automated test execution via GitHub Actions (`.github/workflows/e2e-tests.yml`).

##### Manual Workflow Run

1. Go to **Actions** → **E2E Tests**
2. Click **Run workflow**
3. Enter parameters:
   - **Tags**: e.g., `all`, `smoke`, `preparing policies`, etc.
   - **Solo version**: optional, the Solo release that deploys the local Hiero network

##### Available Input Parameters

- `tags` (default: `smoke`) - Test tags to run. For multiple tags, use spaces (e.g. `policies schemas`) or commas (e.g. `policies,schemas`). In Docker/CI runs, `preparing` is automatically prepended for feature-scoped runs (not for `all`).
- `solo_version` (default: empty, which uses `SOLO_VERSION` in the workflow) - Solo release passed to `hiero-ledger/hiero-solo-action`.

Scheduled runs (nightly, 03:00 UTC) run `all` tags and pushes run `smoke`.

##### Workflow Features

- Starts a local Hiero network with Solo, and uploads the contract bytecode to it
- Builds Guardian services
- Starts MongoDB, NATS, Valkey and Kubo as service containers, and the Guardian services natively
- Runs Cypress natively on the runner against that stack
- Publishes test results
- Uploads HTML and JSON reports as artifacts, plus the Guardian and Solo logs when a run fails
- Deletes the Solo kind cluster at the end of the run

##### Test Report Artifacts

After workflow completion:

1. Open the run in **Actions** → **Summary**.
2. In the **Artifacts** section, download **cypress-reports** (contains the full report tree, including `html/` and `html/.jsons`).
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
npm install
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

#### Cypress 15 and --env

If you see **"Cannot parse as valid JSON"** when using `--env`, you are on Cypress 15+, which requires `--env` to be a JSON object.

- **Option A (recommended):** Use the project’s Cypress 14 from `e2e-tests`: run `npm install` in `e2e-tests` and use `npx cypress run` from that directory so the pinned version (14.x) is used.
- **Option B:** Use JSON for `--env`:

  ```bash
  npx cypress run --browser chrome --env '{"grepTags":"preparing policies","grepFilterSpecs":true}'
  ```

  For all API tests: `--env '{"grepTags":"all","grepFilterSpecs":true}'`

#### Common Issues

##### Tag Syntax Errors

- **Wrong**: `grepTags=all, policies` (space before comma)
- **Correct**: `grepTags=all,policies` or `grepTags=all, policies` (space only after comma)

##### No Tests Found

- Verify tags are spelled correctly
- Ensure tests are tagged in test files with `@tag` syntax
- Check that `grepFilterSpecs=true` is set

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
