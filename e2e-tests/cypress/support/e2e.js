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
import "./api/api-helper";
import "cypress-mochawesome-reporter/register";

import API from "./ApiUrls";


// cypress/support/index.js
// load and register the grep feature using "require" function
// https://github.com/cypress-io/cypress-grep
const registerCypressGrep = require('cypress-grep')
registerCypressGrep()

// Alternatively you can use CommonJS syntax:
// require('./commands')
const authorization = Cypress.env("authorization");


//If StandardRegistry doesn't have hedera credentials, creating them
before(() => {
    let username = "StandardRegistry";
    cy.request({
        method: "POST",
        url: API.ApiServer + "accounts/login",
        body: {
            username: username,
            password: "test"
        }
    }).then((responseWithRT) => {
        cy.request({
            method: "POST",
            url: API.ApiServer + "accounts/access-token",
            body: {
                refreshToken: responseWithRT.body.refreshToken
            }
        }).then((responseWithAT) => {
            cy.request({
                method: "GET",
                url: API.ApiServer + "profiles/" + username,
                headers: {
                    authorization: "Bearer " + responseWithAT.body.accessToken,
                },
            }).then((response) => {
                if (response.body.confirmed === false) {
                    cy.request({
                        method: "PUT",
                        url: API.ApiServer + "profiles/" + username,
                        headers: {
                            authorization: authorization,
                        },
                        body: {
                            hederaAccountId: Cypress.env('operatorId'),
                            hederaAccountKey: Cypress.env('operatorKey'),
                            vcDocument: {
                                geography: "testGeography",
                                law: "testLaw",
                                tags: "testTags",
                                type: "StandardRegistry",
                                "@context": [],
                            },
                        },
                        timeout: 200000,
                    }).then(() => {
                        cy.log("hedera credentials was created");
                    });
                } else {
                    cy.log("User has hedera credentials");
                }
            });
        })
    });
});

require('cy-verify-downloads').addCustomCommand();
