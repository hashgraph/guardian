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
import { METHOD } from "../support/api/api-const";
import * as Authorization from "../support/checkingMethods";

import API from "./ApiUrls";


// cypress/support/index.js
// load and register the grep feature using "require" function
// https://github.com/cypress-io/cypress-grep

const registerCypressGrep = require('cypress-grep')
const SRUsername = Cypress.env('SRUser');
const SR2Username = Cypress.env('SR2User');
const userUsername = Cypress.env('User');
const password = Cypress.env('Password');
let SRDid;

registerCypressGrep()

// Alternatively you can use CommonJS syntax:
// require('./commands')

//If neccessery users doesn't exist, creating them
before(() => {
    let SRExist, SR2Exist, UserExist;
    cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.RegUsers,
    }).then((response) => {
        response.body.forEach(element => {
            if (element.username == SRUsername)
                SRExist = true;
            else if (element.username == SR2Username)
                SR2Exist = true;
            else if (element.username == userUsername)
                UserExist = true;
        })
        if (!SRExist)
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccountRegister,
                body: {
                    username: SRUsername,
                    password: password,
                    password_confirmation: password,
                    role: 'STANDARD_REGISTRY'
                }
            })
        if (!SR2Exist)
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccountRegister,
                body: {
                    username: SR2Username,
                    password: password,
                    password_confirmation: password,
                    role: 'STANDARD_REGISTRY'
                }
            })
        if (!UserExist)
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccountRegister,
                body: {
                    username: userUsername,
                    password: password,
                    password_confirmation: password,
                    role: 'USER'
                }
            })
    });
});

//If SR doesn't have hedera credentials, creating them
before(() => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + "profiles/" + SRUsername,
            headers: {
                authorization,
            },
        }).then((response) => {
            if (response.body.confirmed === false) {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RandomKey,
                    headers: { authorization },
                    timeout:600000
                }).then((response) => {
                    cy.wait(3000)
                    let hederaAccountId = response.body.id
                    let hederaAccountKey = response.body.key
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + "profiles/" + SRUsername,
                        headers: {
                            authorization,
                        },
                        body: {
                            didDocument: null,
                            useFireblocksSigning: false,
                            fireblocksConfig:
                            {
                                fireBlocksVaultId: "",
                                fireBlocksAssetId: "",
                                fireBlocksApiKey: "",
                                fireBlocksPrivateiKey: ""
                            },
                            didKeys: [],
                            hederaAccountId: hederaAccountId,
                            hederaAccountKey: hederaAccountKey,
                            vcDocument: {
                                geography: "testGeography",
                                law: "testLaw",
                                tags: "testTags",
                                type: "StandardRegistry",
                                "@context": [],
                            },
                        },
                        timeout: 400000,
                    }).then(() => {
                        cy.log("hedera credentials was created");
                    });
                })
            } else {
                cy.log("User has hedera credentials");
            }
        });
    })
});

//If SR2 doesn't have hedera credentials, creating them
before(() => {
    Authorization.getAccessToken(SR2Username).then((authorization) => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + "profiles/" + SR2Username,
            headers: {
                authorization,
            },
        }).then((response) => {
            if (response.body.confirmed === false) {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RandomKey,
                    headers: { authorization },
                }).then((response) => {
                    cy.wait(3000)
                    let hederaAccountId = response.body.id
                    let hederaAccountKey = response.body.key
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + "profiles/" + SR2Username,
                        headers: {
                            authorization,
                        },
                        body: {
                            didDocument: null,
                            useFireblocksSigning: false,
                            fireblocksConfig:
                            {
                                fireBlocksVaultId: "",
                                fireBlocksAssetId: "",
                                fireBlocksApiKey: "",
                                fireBlocksPrivateiKey: ""
                            },
                            didKeys: [],
                            hederaAccountId: hederaAccountId,
                            hederaAccountKey: hederaAccountKey,
                            vcDocument: {
                                geography: "testGeography",
                                law: "testLaw",
                                tags: "testTags",
                                type: "StandardRegistry",
                                "@context": [],
                            },
                        },
                        timeout: 400000,
                    }).then(() => {
                        cy.log("hedera credentials was created");
                    });
                })
            } else {
                cy.log("User has hedera credentials");
            }
        });
    })
});

//If User doesn't have hedera credentials, creating them
before(() => {
    Authorization.getAccessToken(userUsername).then((authorization) => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + "profiles/" + userUsername,
            headers: {
                authorization,
            },
        }).then((response) => {
            if (response.body.confirmed === false) {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + 'accounts/standard-registries/aggregated',
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    response.body.forEach(element => {
                        if (element.username == SRUsername)
                            SRDid = element.did;
                    })
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.RandomKey,
                        headers: { authorization },
                    }).then((response) => {
                        cy.wait(3000)
                        let hederaAccountId = response.body.id
                        let hederaAccountKey = response.body.key
                        cy.request({
                            method: METHOD.PUT,
                            url: API.ApiServer + "profiles/" + userUsername,
                            headers: {
                                authorization,
                            },
                            body: {
                                hederaAccountId: hederaAccountId,
                                hederaAccountKey: hederaAccountKey,
                                parent: SRDid
                            },
                            timeout: 400000,
                        }).then(() => {
                            cy.log("hedera credentials was created");
                        });
                    })
                })
            } else {
                cy.log("User has hedera credentials");
            }
        });
    })
});

require('cy-verify-downloads').addCustomCommand();
