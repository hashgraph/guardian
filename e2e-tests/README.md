# Guardian Test Automation

## Description
The `/e2e-tests` folder comprises the Guardian Cypress test automation framework and automated UI and API tests.

When running API tests, remember that they depend on each other. It is recommended to run them sequentially, following the order specified in the `/e2e-tests` folder.

- [Software Requirements](#software-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Running Tests with Tags](#running-tests-with-tags)
- [Docker Setup](#docker-setup)
- [CI/CD Integration](#cicd-integration)
- [Test Reports](#test-reports)
- [Troubleshooting](#troubleshooting)

## Software Requirements
- Node.js 20 and above
- Docker and Docker Compose (for Docker-based test execution)
- Follow steps from the [README](https://github.com/hashgraph/guardian/blob/main/README.md) to install and deploy the Guardian application.

## Installation

### Manual Setup
From the `/e2e-tests` folder, run the following command to install Cypress:

```bash
npm install cypress --save-dev
```

## Configuration

### Environment Variables

If you built the Guardian in Docker, set the `portApi` variable in `cypress.env.json` file. The configuration supports the following variables:

- `portApi` - API port (default: `4200/api/v1`)
- `baseUrl` - Base URL for the application (default: `http://localhost:4200`)
- `operatorId` - Hedera operator ID
- `operatorKey` - Hedera operator key
- `MGSAdmin` - MGS tenant name
- `MGSIndexerAPIToken` - MGS Indexer API token

## Usage

### Interactive Dashboard
To run a specific test from the UI, you can open the Cypress dashboard:

```bash
npx cypress open
```

### Local Command Line Execution

The project pins Cypress 14.x (`package.json`). If you use **Cypress 15+**, `--env` requires **JSON** (see [Cypress 15 and --env](#cypress-15-and---env) below).

#### Run all API tests (most basic)
```bash
npx cypress run --browser chrome --env "grepTags=all,grepFilterSpecs=true"
```

#### Run with specific tags (sanity testing with user preparation)
```bash
npx cypress run --browser chrome --headed --env "grepTags=preparing policies,grepFilterSpecs=true"
```

**Cypress 15+ only** (if you see "Cannot parse as valid JSON"):
```bash
npx cypress run --browser chrome --headed --env '{"grepTags":"preparing policies","grepFilterSpecs":true}'
```

#### Run single test file
```bash
npx cypress run --spec "path/to/file.cy.js"
```

#### Run all UI tests
```bash
npx cypress run --env "grepTags=ui,grepFilterSpecs=true"
```

#### Run smoke tests
```bash
npx cypress run --env "grepTags=smoke,grepFilterSpecs=true"
```

### Running Tests with Tags

Tags allow you to run specific test subsets. For local CLI runs using `--env "grepTags=..."`, pass multiple tags as a **space-separated** list. For Docker runs, `CYPRESS_grepTags` accepts both spaces and commas (the entrypoint normalizes them).

#### Verified tag examples

**All API tests (basic run):**
```bash
npx cypress run --browser chrome --env "grepTags=all,grepFilterSpecs=true"
```

**Sanity run (preparing + specific feature, e.g. policies):**
```bash
npx cypress run --browser chrome --headed --env "grepTags=preparing policies,grepFilterSpecs=true"
```

**Cypress 15+:** use JSON for `--env`, e.g. `--env '{"grepTags":"preparing policies","grepFilterSpecs":true}'`

#### Single Tag
```bash
npx cypress run --browser chrome --env "grepTags=accounts,grepFilterSpecs=true"
```

#### Multiple Tags (AND operation)
```bash
npx cypress run --browser chrome --env "grepTags=preparing policies,grepFilterSpecs=true"
```

**Important**:
- **Local CLI (`--env "..."`)**: use spaces, e.g. `preparing policies`
- **Docker (`CYPRESS_grepTags=...`)**: spaces or commas are accepted, e.g. `preparing policies` or `preparing,policies`

#### Available Tags

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

**Note**: E2E tests for the Guardian platform are interdependent. When running tests using certain tags, additional tests may be executed to ensure successful test run. Always include the `preparing` tag when running feature-specific tests to ensure user accounts are created.

## Docker Setup

### Overview

The e2e-tests directory includes Docker setup for containerized test execution. Two Dockerfile variants are available:

1. **Dockerfile** - Uses Electron browser (default in container). No extra browser install; use for fast, minimal runs.
2. **Dockerfile.chrome** - Installs Chromium and defaults to `CYPRESS_BROWSER=chromium`; use for CI/Docker runs.

Tests run in Docker only if the chosen browser exists in the image: use **Dockerfile** for Electron, **Dockerfile.chrome** for Chrome.

### Building the Docker Image

#### Using Electron (default Dockerfile):
```bash
cd e2e-tests
docker build -t cypress-runner .
docker run --network host -e CYPRESS_grepTags="all" -e CYPRESS_grepFilterSpecs=true cypress-runner
```

#### Using Chrome (docker-compose or Dockerfile.chrome):
```bash
cd e2e-tests
docker-compose build
```

The `docker-compose.yml` uses `Dockerfile.chrome` and sets `CYPRESS_BROWSER=chromium`.

### Running Tests in Docker

Ensure Guardian is running and reachable (e.g. API on port 3002). From the repo root, build the image once, then run with the desired tags.

#### Sanity tests (preparing + policies; common smoke/sanity run)
```bash
cd e2e-tests
docker-compose build
CYPRESS_grepTags="preparing policies" CYPRESS_grepFilterSpecs=true docker-compose up
```

#### Smoke tests only
```bash
cd e2e-tests
CYPRESS_grepTags="smoke" CYPRESS_grepFilterSpecs=true docker-compose up
```

#### All API tests
```bash
cd e2e-tests
CYPRESS_grepTags=all CYPRESS_grepFilterSpecs=true docker-compose up
```

> Note: when running API tests in Docker, we target the API gateway directly at `:3002` (no `/api/v1` prefix).
> If you point Cypress at `http://...:3002/api/v1/...` you’ll get 404s (the Angular `:4200/api/v1` proxy normally rewrites that prefix away).

#### Using raw Docker (from repo root)
```bash
docker build -f e2e-tests/Dockerfile.chrome -t cypress-runner ./e2e-tests
# Sanity:
docker run --rm --network host -e CYPRESS_portApi=3002 -e CYPRESS_grepTags="preparing policies" -e CYPRESS_grepFilterSpecs=true cypress-runner
# Smoke:
docker run --rm --network host -e CYPRESS_portApi=3002 -e CYPRESS_grepTags="smoke" -e CYPRESS_grepFilterSpecs=true cypress-runner
```

#### With custom authentication:
```bash
cd e2e-tests
CYPRESS_grepTags="preparing policies" \
CYPRESS_grepFilterSpecs=true \
CYPRESS_operatorId=0.0.xxx \
CYPRESS_operatorKey=xxxx \
docker-compose up
```

#### Using raw Docker command:

```bash
docker run --network host --name cypress-test-run \
  -e CYPRESS_portApi=3002 \
  -e CYPRESS_apiServer=http://host.docker.internal:3002/ \
  -e CYPRESS_grepTags="all" \
  -e CYPRESS_grepFilterSpecs=true \
  cypress-build:chrome
```

### Docker Environment Variables

When running Docker tests, all environment variables must be prefixed with `CYPRESS_`:

| Variable | Default | Description |
|----------|---------|-------------|
| CYPRESS_portApi | 3002 | Guardian API port (direct API gateway). For local runs via the Angular proxy, this is typically `4200/api/v1` |
| CYPRESS_baseUrl | - | Base URL for UI tests (optional). When using `docker compose`, set `CYPRESS_UI_BASEURL` (it maps to `CYPRESS_baseUrl`) e.g. `http://host.docker.internal:4200` |
| CYPRESS_grepTags | all | Tag filter; for multiple tags use spaces (e.g. `preparing policies`). Commas are also accepted. |
| CYPRESS_grepFilterSpecs | true | Enable tag filtering |
| CYPRESS_operatorId | - | Hedera operator ID (optional) |
| CYPRESS_operatorKey | - | Hedera operator key (optional) |
| CYPRESS_BROWSER | electron in default image, chromium in docker-compose | Browser: `electron`, `chromium`, or `firefox` (must exist in the image) |
| CYPRESS_apiServer | - | Optional full API origin override (useful on Docker Desktop). Examples: `http://host.docker.internal:3002/` (direct API gateway) or `http://host.docker.internal:4200/api/v1/` (if using Angular proxy) |

### Configuration File

Create `.env` file in the e2e-tests directory for persistent environment variables:

```bash
CYPRESS_operatorId=0.0.7416934
CYPRESS_operatorKey=302e020100300506032b6570042204207b761e73e67ca2c44270724eb60314bff2f13483bf1b69fd69c0d58f178654b5
CYPRESS_MGSAdmin=
CYPRESS_MGSIndexerAPIToken=
```

The `.env` file is automatically loaded by docker-compose and will override defaults.

When running `docker compose` from `e2e-tests/`, we also load `../guardian-service/configs/.env.guardian` so `OPERATOR_ID` / `OPERATOR_KEY` can be picked up automatically (they’re mapped to `operatorId` / `operatorKey` inside `entrypoint.sh`).

### Available Browsers in Docker

- **Electron** (default in original Dockerfile) - Lightweight, fast, minimal overhead
- **Chrome** (in Dockerfile.chrome) - Full browser, more realistic web testing
- **Firefox** - Alternative browser option (use: --browser firefox)

### Switching Browsers

Set `CYPRESS_BROWSER`; the browser must be installed in the image (Electron in default Dockerfile, Chrome in Dockerfile.chrome):

```bash
CYPRESS_BROWSER=chromium docker-compose up
CYPRESS_BROWSER=electron docker run ...  # only if using default Dockerfile
```

### Extracting Test Results from Docker

After running tests in Docker, results are automatically available in:

```bash
ls -la cypress/reports/html/
ls -la cypress/test_results/junit/
```

These directories are mounted as volumes from the Docker container to your local machine.

## CI/CD Integration

### GitHub Actions Workflow

The repository includes automated test execution via GitHub Actions (`.github/workflows/api-manual.yml`).

#### Manual Workflow Run

1. Go to **Actions** → **Guardian CI API Tests (Manual)**
2. Click **Run workflow**
3. Enter parameters:
   - **Tags**: e.g., `all`, `smoke`, `preparing policies`, etc.
   - **Report name**: Custom report title

#### Available Input Parameters

- `tags` (default: `all`) - Test tags to run. For multiple tags, use spaces (e.g. `policies schemas`) or commas (e.g. `policies,schemas`). In Docker/CI runs, `preparing` is automatically prepended for feature-scoped runs (not for `all`).
- `report_name` (default: `Guardian's Cypress Report`) - Custom report name

#### Workflow Features

- Automatically builds Guardian services
- Starts necessary services (MongoDB, NATS, Guardian services)
- Runs Cypress tests in Docker
- Publishes test results
- Uploads HTML and JSON reports as artifacts
- Cleans up Docker resources

#### Test Report Artifacts

After workflow completion:

1. Open the run in **Actions** → **Summary**.
2. In the **Artifacts** section, download **cypress-reports** (contains the full report tree, including `html/` and `html/.jsons`).
3. Unzip and open `html/index.html` in a browser to view the interactive Cypress report (test details, screenshots, etc.).
4. **Published results** – JUnit results are also published to the workflow summary.

## Test Reports

### Local Test Reports

After running tests locally, find reports in:

```
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

### Docker Test Reports

To access reports from Docker runs:

1. Copy reports from container:
```bash
docker cp cypress-test-run:/e2e/cypress/reports ./e2e-tests/cypress/reports
```

2. Open `cypress/reports/html/index.html` in your browser

### Report Contents

The HTML report includes:

- Test execution summary (passed, failed, skipped)
- Individual test details
- Video recordings of failed tests
- Screenshots from failures
- Test duration and timing
- Detailed error messages and stack traces

## Common Usage Patterns

### Pattern 1: Basic API Test Run
```bash
npm install
npx cypress run --browser chrome --env "grepTags=all,grepFilterSpecs=true"
```

### Pattern 2: Sanity Testing (Prepare Users + Run Policies Tests)
```bash
npx cypress run --browser chrome --headed --env "grepTags=preparing policies,grepFilterSpecs=true"
```

### Pattern 3: Docker-based Full Test Suite
```bash
docker build -t cypress-runner ./e2e-tests
docker run --network host \
  -e CYPRESS_portApi=3002 \
  -e CYPRESS_grepTags="all" \
  -e CYPRESS_grepFilterSpecs=true \
  cypress-runner
```

### Pattern 4: Running Multiple Feature Tags
```bash
npx cypress run --browser chrome --env "grepTags=preparing policies schemas artifacts,grepFilterSpecs=true"
```

## Troubleshooting

### Cypress 15 and --env

If you see **"Cannot parse as valid JSON"** when using `--env`, you are on Cypress 15+, which requires `--env` to be a JSON object.

- **Option A (recommended):** Use the project’s Cypress 14 from `e2e-tests`: run `npm install` in `e2e-tests` and use `npx cypress run` from that directory so the pinned version (14.x) is used.
- **Option B:** Use JSON for `--env`:
  ```bash
  npx cypress run --browser chrome --env '{"grepTags":"preparing policies","grepFilterSpecs":true}'
  ```
  For all API tests: `--env '{"grepTags":"all","grepFilterSpecs":true}'`

### Common Issues

#### Tag Syntax Errors
- **Wrong**: `grepTags=all, policies` (space before comma)
- **Correct**: `grepTags=all,policies` or `grepTags=all, policies` (space only after comma)

#### No Tests Found
- Verify tags are spelled correctly
- Ensure tests are tagged in test files with `@tag` syntax
- Check that `grepFilterSpecs=true` is set

#### Docker Connection Issues
- Use `--network host` for Docker to access localhost services
- Verify Guardian services are running on expected ports
- Check firewall settings

#### Missing Test Results
- Verify Docker volume mounts are correct
- Ensure output directories exist in container
- Check Docker `cp` command paths

#### Insufficient Balance Errors
- Ensure Hedera operator account has sufficient balance
- For CI runs, verify secrets are properly configured

### Debug Mode

To run tests with more verbose output:

```bash
npx cypress run --browser chrome --env "grepTags=all,grepFilterSpecs=true" --headed
```

## Screenshots

After launching the tests, a folder `cypress/screenshots` will be generated. Inside you can find the screenshots for failures of UI tests.

## Notes

- E2E tests for the Guardian platform are interdependent, so when running tests using certain tags, additional tests may be executed to ensure a successful test run.
- Always ensure the `preparing` tag runs before feature-specific tags to set up necessary user accounts.
- Test execution time varies based on network connectivity to Hedera and IPFS.
- Ensure you have sufficient balance on your Hedera account for all operations performed during tests.
