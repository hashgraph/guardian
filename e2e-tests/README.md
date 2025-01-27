# Guardian Test Automation

## Description
The `/e2e-tests` folder comprises the Guardian Cypress test automation framework and automated UI and API tests.
- [Software Requirements](#software-requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Report](#report)

## Software Requirements
- Node.js 20 and above
- Follow steps from the [README](https://github.com/hashgraph/guardian/blob/main/README.md) to install and deploy the Guardian application.

## Installation

### Manual
From the `/e2e-tests` folder, run the following command to install Cypress:

`npm install cypress --save-dev`

## Usage
To run a specific test from the UI, you can open the Cypress dashboard by running the following command from the `/e2e-tests` folder:

`npx cypress open`

To run all tests sequentially, use:

`npx cypress run`

For a single test, use:

`npx cypress run --spec path/to/file.cy.js`

### Run by tag
To run only the specs that have any tests tagged "@tag":

`npx cypress run --env grepTags=@tag,grepFilterSpecs=true`

where @tag can be:
- accounts - all tests for accounts operations
- demo - all tests for demo operations
- external - all tests for external operations
- ipfs - all tests for IPFS operations
- logs - - all tests for log operations
- policies - all tests for policies operations
- dry-run - all tests for dry-run operations
- profilies - all tests for profilies operations
- schemas - all tests for schemas operations
- settings - all tests for settings operations
- tokens - all tests for tokens operations
- trustchains - all tests for trustchains operations

### UI Tests (Policies)

Only iREC5, iREC7 and Verra3 policies are covered.

The following command runs all UI tests in an interactive dashboard that allows you to see the status of the tests while they are running and simultaneously view the application under test.

   ```shell
    npm run ui-only
   ```

To run a UI test for a specific policy, you can open the Cypress dashboard by running the following command from the `/e2e-tests` folder:

`npx cypress open`

and then select a test under `ui-tests/specs/policies`.

### Smoke Pull of API Tests

The pull runs automatically after any commit in the Guardian repository.

The following command from the `/e2e-tests` directory runs smoke pull locally.

   ```shell
    npm run smoke-pull
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

## Report

After launching the tests, a folder `cypress/reports` will be generated. Inside you can find the `index.html` file. Opening this file in a browser allows you to see the details of the test run.
