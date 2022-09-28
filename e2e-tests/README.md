# Guardian-automation

## Description
This is a place for guardian automation tests
- [Installation](#installation)
- [Usage](#usage)

## Usage of cypress.env
In this file a user need to add own `authorization` key which is `access_key` which assign to a RootAuthority after registartation (bearerAuth)

## Installation
- Install Cypress running `npm install cypress --save-dev`
- Then for the first time run `npx cypress open`. Cypress dashboard which give an access to pick a test and run it from dashboard
- To run tests from terminal use `npx cypress run` which will run all tests
- For single test use `npx cypress run --spec path/to/file.spec.js`

## Usage
`npx cypress open` - to open the Cypress Dashboard
`npx cypress run` - to run the Cypress tests

