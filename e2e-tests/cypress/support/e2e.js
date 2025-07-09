// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";
import "cypress-real-events";
import "./api/api-helper";
import "cypress-mochawesome-reporter/register";


// cypress/support/index.js
// load and register the grep feature using "require" function
// https://github.com/cypress-io/cypress-grep

const registerCypressGrep = require('@cypress/grep')

registerCypressGrep()

require('cy-verify-downloads').addCustomCommand();

beforeEach('Time logging', () => {
    cy.task('log', Cypress.currentTest.title + " started on:")
    cy.task('log', new Date(Date.now()))
})

// Alternatively you can use CommonJS syntax:
// require('./commands')