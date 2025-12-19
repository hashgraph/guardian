import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['remote_policy', 'secondPool', 'all'] }, () => {

    const MainSRUsername = Cypress.env('MainSRUser');
    const MainUserUsername = Cypress.env('MainUser');
    const DepSRUsername = Cypress.env('DepSRUser');
    const DepUserUsername = Cypress.env('DepUser');
    const MGSAdminUsername = Cypress.env('MGSAdmin');
    const password = Cypress.env('Password');
    const tenantName = "testTenantFromOS";
    const email = "apitestosnna@envisionblockchain.com";

    let depUserData, SRDid, tenantId;

    it("Create dependent users", () => {
        let SRExist, UserExist;
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.RegUsers,
        }).then((response) => {
            response.body.forEach(element => {
                if (element.username == DepSRUsername)
                    SRExist = true;
                else if (element.username == DepUserUsername)
                    UserExist = true;
            })
            if (!SRExist)
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.AccountRegister,
                    body: {
                        username: DepSRUsername,
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
                        username: DepUserUsername,
                        password: password,
                        password_confirmation: password,
                        role: 'USER'
                    }
                })
        });

        Authorization.getAccessToken(DepSRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + "profiles/" + DepSRUsername,
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
                            url: API.ApiServer + "profiles/" + DepSRUsername,
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

        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + "profiles/" + DepUserUsername,
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
                            if (element.username == DepSRUsername)
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
                                url: API.ApiServer + "profiles/" + DepUserUsername,
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
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + "profiles/" + DepUserUsername,
                headers: {
                    authorization,
                },
            }).then((response) => {
                depUserData = response.body;
            })
        })
    });

    it("Create main users", () => {
        Authorization.getAccessTokenMGS(MGSAdminUsername, null).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiMGS + API.TenantsUser,
                headers: {
                    authorization,
                },
                body: {
                    tenantName: tenantName,
                    network: "testnet",
                    ipfsSettings: {
                        provider: "local"
                    }
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                tenantId = response.body.id;
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiMGS + API.TenantsInvite,
                    headers: {
                        authorization,
                    },
                    body: {
                        tenantId: tenantId,
                        email: email,
                        returnInviteCode: true,
                        role: "STANDARD_REGISTRY"
                    }
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiMGS + API.AccountRegister,
                        headers: {
                            authorization,
                        },
                        body: {
                            username: MainSRUsername,
                            password: password,
                            password_confirmation: password,
                            role: "STANDARD_REGISTRY",
                            inviteId: response.body.inviteId,
                            terms: {
                                name: "MGS.v2",
                                accepted: true
                            }
                        }
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        Authorization.getAccessToken(DepSRUsername).then((authorization) => {
                            cy.request({
                                method: METHOD.GET,
                                url: API.ApiServer + API.RandomKey,
                                headers: { authorization },
                            }).then((response) => {
                                cy.wait(3000)
                                let hederaAccountId = response.body.id
                                let hederaAccountKey = response.body.key
                                Authorization.getAccessTokenMGS(MainSRUsername, tenantId).then((authorization) => {
                                    cy.request({
                                        method: METHOD.POST,
                                        url: API.ApiMGS + API.TermsAgree,
                                        headers: {
                                            authorization,
                                        },
                                        body: {
                                            terms: "MGS.v2",
                                        }
                                    }).then((response) => {
                                        cy.request({
                                            method: METHOD.PUT,
                                            url: API.ApiMGS + API.Profiles + MainSRUsername,
                                            headers: {
                                                authorization,
                                            },
                                            body: {
                                                hederaAccountId,
                                                hederaAccountKey,
                                                secret: null,
                                                vcDocument: {
                                                    "OrganizationName": "g",
                                                    "AddressLine1": "g",
                                                    "City": "g",
                                                    "Country": "g",
                                                    "PostalCode": "y",
                                                    "Website": "https://vfds.fds",
                                                    "Email": "fdsf@fds.csda",
                                                    "Tags": "fdsa",
                                                    "ISIC": "dsaf"
                                                },
                                                "didDocument": null,
                                                "useFireblocksSigning": false,
                                                "fireblocksConfig": {
                                                    "fireBlocksVaultId": "",
                                                    "fireBlocksAssetId": "",
                                                    "fireBlocksApiKey": "",
                                                    "fireBlocksPrivateiKey": ""
                                                },
                                                "didKeys": []
                                            },
                                            timeout: 180000
                                        })
                                    })
                                })
                            })
                        })
                    })
                })
            })
        });

        Authorization.getAccessTokenMGS(MGSAdminUsername, null).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiMGS + API.TenantsInvite,
                headers: {
                    authorization,
                },
                body: {
                    tenantId: tenantId,
                    email: email,
                    returnInviteCode: true
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiMGS + API.AccountRegister,
                    headers: {
                        authorization,
                    },
                    body: {
                        username: MainUserUsername,
                        password: password,
                        password_confirmation: password,
                        role: "USER",
                        inviteId: response.body.inviteId,
                        terms: {
                            name: "MGS.v2",
                            accepted: true
                        }
                    }
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                    Authorization.getAccessTokenMGS(MainUserUsername, tenantId).then((authorization) => {
                        cy.request({
                            method: METHOD.POST,
                            url: API.ApiMGS + API.TermsAgree,
                            headers: {
                                authorization,
                            },
                            body: {
                                terms: "MGS.v2",
                            }
                        }).then((response) => {
                            cy.request({
                                method: METHOD.GET,
                                url: API.ApiMGS + 'accounts/standard-registries',
                                headers: {
                                    authorization
                                }
                            }).then((response) => {
                                response.body.forEach(element => {
                                    if (element.username == MainSRUsername)
                                        SRDid = element.did;
                                })
                                cy.request({
                                    method: METHOD.PUT,
                                    url: API.ApiMGS + API.Profiles + MainUserUsername,
                                    headers: {
                                        authorization,
                                    },
                                    body: {
                                        didDocument: depUserData.didDocument.document,
                                        hederaAccountId: depUserData.hederaAccountId,
                                        parent: SRDid,
                                        topicId: depUserData.topicId,
                                        type: "remote"
                                    },
                                    timeout: 180000
                                })
                            })
                        })
                    })
                })
            })
        })
    })
});
