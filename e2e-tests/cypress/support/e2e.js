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
        method: "GET",
        url: API.ApiServer + "profiles/" + username,
        headers: {
            authorization: authorization,
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
                    hederaAccountId: "0.0.3763210",
                    hederaAccountKey:
                        "302e020100300506032b657004220420a11e17f31581cecd57858121865fa51c965a3f8491f29f523f6161188e6a8921",
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
});
