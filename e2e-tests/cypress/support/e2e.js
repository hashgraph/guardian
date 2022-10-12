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

// Alternatively you can use CommonJS syntax:
// require('./commands')
const authorization = Cypress.env("authorization");


//If StandardRegistry doesn't have hedera credentials, creating them
before(() => {
    let username = "StandardRegistry";
    cy.request({
        method: "GET",
        url: Cypress.env("api_server") + "profiles/" + username,
        headers: {
            authorization: authorization,
        },
    }).then((response) => {
        if (response.body.confirmed === false) {
            cy.request({
                method: "PUT",
                url: Cypress.env("api_server") + "profiles/" + username,
                headers: {
                    authorization: authorization,
                },
                body: {
                    hederaAccountId: "0.0.46804835",
                    hederaAccountKey:
                        "302e020100300506032b657004220420aaf0eac4a188e5d7eb3897866d2b33e51ab5d7e7bfc251d736f2037a4b2075e8",
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


//If user does not have a policy import them
