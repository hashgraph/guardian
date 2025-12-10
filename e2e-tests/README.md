# Guardian Test Automation

## Description
The `/e2e-tests` folder comprises the Guardian Cypress test automation framework and automated UI and API tests.

When running API tests, remember that they depend on each other. It is recommended to run them sequentially, following the order specified in the `/e2e-tests` folder.

- [Software Requirements](#software-requirements)
- [Installation](#installation)
- [Configuration](#installation)
- [Usage](#usage)
- [Report](#report)

## Software Requirements
- Node.js 20 and above
- Follow steps from the [README](https://github.com/hashgraph/guardian/blob/main/README.md) to install and deploy the Guardian application.

## Installation

### Manual
From the `/e2e-tests` folder, run the following command to install Cypress:

`npm install cypress --save-dev`

## Configuration

If you built the Guardian in Docker, set the `portApi` variable in `cypress.env.json` file.

## Usage

To run a specific test from the UI, you can open the Cypress dashboard by running the following command from the `/e2e-tests` folder:

`npx cypress open`

To run all API tests sequentially, use:

`npx cypress run --env "grepTags=all,grepFilterSpecs=true"`

To run all UI tests sequentially, use:

`npx cypress run --env "grepTags=ui,grepFilterSpecs=true"`

For a single test, use:

`npx cypress run --spec "path/to/file.cy.js"`

Note: For major part of E2E tests for the Guardian application needs to:
- have valid accounts. Test in `e2e-tests\cypress\e2e\api-tests\000_accounts_creating` automatically creates and provide hedera credentinals for accounts which uses in tests.
- balance for operations. Ensure that you have sufficient balance on your Hedera account.
- stable connection to Hedera and IPFS.

### Run By Tag
To run only the specs that have any tests tagged "tag":

`npx cypress run --env "grepTags=tag,grepFilterSpecs=true"` for one tag,
`npx cypress run --env "grepTags=tag1 tag2,grepFilterSpecs=true"` for two and more tags


where `tag` can be:
- accounts - all tests for accounts operations
- analytics - all tests for analytics operations
- artifacts - - all tests for artifacts operations
- contracs - all tests for contracs operations
- demo - all tests for demo operations
- external - all tests for external operations
- ipfs - all tests for IPFS operations
- logs - - all tests for log operations
- modules - - all tests for modules operations
- policies - all tests for policies operations
- profilies - all tests for profilies operations
- schemas - all tests for schemas operations
- settings - - all tests for settings operations
- tags - all tests for tags operations
- tokens - all tests for tokens operations
- trustchains - all tests for trustchains operations
- worker - all tests for workers tasks logging operations
- themes - all tests for operations with themes
- branding - all tests for operations with branding
- notifications - all tests for operations with notifications
- wizard - all tests for operations with policy wizard
- permissions - all tests for operations with permissions
- formulas - all tests for operations with formulas
- policy_labels - all tests for operations with policy labels
- remote_policy - all tests for remote policy feature(using MGS)

There's few tags for general tests runs:
- all - all API tests for Guardian platform
- preparing - special test used for generated accounts for tests
- smoke - all tests for the most important and frequently used functionality
- ui - all UI tests

Note: E2E tests for the Guardian platform are interdependent, so when running tests using certain tags, additional tests may be executed to ensure a successful test run.

### UI Tests (Policies)

Only iREC3, iRec4, iREC5, iREC7 and CDM-0001 policies are covered.

The following command runs all UI tests in an interactive dashboard that allows you to see the status of the tests while they are running and simultaneously view the application under test.

   ```shell
    npx cypress run --env "grepTags=ui,grepFilterSpecs=true" 
   ```

To run a UI test for a specific policy, you can open the Cypress dashboard by running the following command from the `/e2e-tests` folder:

`npx cypress open`

and then select a test under `ui-tests/specs/policies`.

### API Tests

The following command runs all API tests.

   ```shell
    npx cypress run --env "grepTags=all,grepFilterSpecs=true" 
   ```

To run a API test for a specific functionality, you can open the Cypress dashboard by running the following command from the `/e2e-tests` folder:

`npx cypress open`

and then select a test under `/api-tests`.

### Smoke Pull of API Tests

The pull runs automatically after any commit in the Guardian repository.

The following command from the `/e2e-tests` directory runs smoke pull locally.

   ```shell
    npx cypress run --env "grepTags=smoke,grepFilterSpecs=true"
   ```

Functionality covered by this pull includes:

- Login by Standard Registry user
- Register and login as a new user
- Send data from an external source (IPFS external node)
- Get current settings
- Set settings
- Get, import (file and IPFS), and delete modules
- Get, upload, and delete artifacts
- Get, import, delete, dry-run, and publish policies (iREC2, iREC4, Remote GHG Policy)
- Get, create, publish, freeze/unfreeze, associate/disassociate, and grant/revoke KYC tokens
- Get, import (file and IPFS), publish, and delete schemas
- Compare modules, policies, schemas, and tools
- Create contracts, create retire pools, approve wipe contract requests, and create retire requests
- Create contract, module, policy, and schema tags

## Screenshots

After launching the tests, a folder `cypress/screenshots` will be generated. Inside you can find the screenshots for failures of UI tests.

## Report

After launching the tests, a folder `cypress/reports` will be generated. Inside you can find the `index.html` file. Opening this file in a browser allows you to see the details of the test run.