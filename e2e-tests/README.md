# Guardian test automation

## Description
The /e2e-tests folder comprises guardian Cypress test automation framework and automated UI and API tests
- [Software requirements](#software-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)

## Software requirements
- Node.js 12 or 14 and above
- Follow steps from the [README](https://github.com/hashgraph/guardian/blob/main/README.md) to install and deploy Guardian application


## Configuration 
In cypress.env.json file update `authorization` key with `access_key` value which will be assigned to the RootAuthority after registartation (bearerAuth)
If you manually built every component in guardian, set the propper url to `api-server` key.


## Installation

### Automatic with Docker

From /e2e-tests folder:

   ```shell
   docker-compose build 
   ```

To run all tests sequentially in Docker use:

   ```shell
   docker-compose run cypress-tests
   ```

With specific port:
   ```shell
   docker-compose run cypress-tests -e PORT=3000
   ```

### Manual
From /e2e-tests folder run the following command to install Cypress: 

`npm install cypress --save-dev`


## Usage

To run a specific test from UI you can open Cypress dashboard by running the following command from /e2e-tests folder:

`npx cypress open`

To run all tests sequentially use:

`npx cypress run`

For a single test use:

`npx cypress run --spec path/to/file.cy.js`

## Run by tag
To run only the specs that have any tests tagged "@tag":

`npx cypress run --env grepTags=@tag,grepFilterSpecs=true`

where @tag can be:
- accounts - all tests for accounts operations
- demo - all tests for demo operations
- external - all tests for external operations
- ipfs - all tests for ipfs operations
- logs - - all tests for logs operations
- policies - all tests for policies operations
- dry-run - all tests for dry-run operations
- profilies - all tests for profilies operations
- schemas - all tests for schemas operations
- settings - all tests for settings operations
- tokens - all tests for tokens operations
- trustchains - all tests for trustchains operations


To run in Docker
   ```shell
   TAG=<TEST-TAG> docker-compose run --entrypoint="npm run test-tag" cypress-tests
   ```

## UI tests (Policies)

Only iREC5, iREC7 and Verra3 policies are covered.

A command

   ```shell
    npm run ui-only
   ```

runs all ui tests in a interactive dashboard that allows you to see the status of the tests while they are running and at the same time view the application under test. 


To run a UI test for specific policy you can open Cypress dashboard by running the following command from /e2e-tests folder:

`npx cypress open`

and then select test under ui-tests/specs/policies 

## Report 

After launching the tests a folder `cypress/reports` will be generated in which you can find the `index.html` file, after opening it in the browser, you can see the details of the launch of the tests.
