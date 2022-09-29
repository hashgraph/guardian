# Guardian-automation

## Description
This is a place for guardian automation tests
- [Installation](#installation)
- [Usage](#usage)

## Configuration 
In cypress.env file a user need to add own `authorization` key which is `access_key` which assign to a RootAuthority after registartation (bearerAuth)

## Installation

Run the following command to install Cypress: 
`npm install cypress --save-dev`
Once Cypress has been installed, you can run it using the following command:
`npx cypress open`
Cypress dashboard which give an access to pick a test and run it from dashboard


## Usage

From Cypress Dashboard
`npx cypress open` - to open the Cypress Dashboard

From terminal
- To run tests from terminal use `npx cypress run` which will run all tests
- For single test use `npx cypress run --spec path/to/file.cy.js`
