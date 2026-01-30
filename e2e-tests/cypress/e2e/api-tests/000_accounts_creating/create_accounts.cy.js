import { METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Prepare accounts for future tests", { tags: ['preparing', 'smoke', 'all', 'ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const SR2Username = Cypress.env('SR2User');
    const Installer = Cypress.env('Installer');
    const userUsername = Cypress.env('User');
    const password = Cypress.env('Password');

    let SRDid;


    it('Verify that default users exist', () => {
        const defaults = [
            { username: SRUsername, role: 'STANDARD_REGISTRY' },
            { username: SR2Username, role: 'STANDARD_REGISTRY' },
            { username: Installer, role: 'STANDARD_REGISTRY' },
            { username: userUsername, role: 'USER' },
        ];

        const registerUser = (username, role) => {
            return cy.request({
                method: METHOD.POST,
                url: `${API.ApiServer}${API.AccountRegister}`,
                body: {
                    username,
                    password,
                    password_confirmation: password,
                    role,
                }
            });
        };

        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.RegUsers}`
        })
            .its('body')
            .then((users) => {
                const existingUsernames = new Set(users.map((u) => u.username));

                // Iterate through each default and register if missing
                defaults.forEach(({ username, role }) => {
                    if (!existingUsernames.has(username)) {
                        registerUser(username, role);
                    }
                });
            });
    });

    //If SR doesn't have hedera credentials, creating them
    it("Generate hedera credentials for SR, if there're no creds", () => {
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
                        timeout: 600000
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
    it("Generate hedera credentials for SR2, if there're no creds", () => {
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
    it("Generate hedera credentials for User, if there're no creds", () => {
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
});