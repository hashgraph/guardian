import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Contracts", { tags: '@contracts' }, () => {
    const authorization = Cypress.env("authorization");
    let contractIdR, contractIdW;
    let contractIdHedW;
    let contractIdRVerra;
    const username = "Verra"
    before(() => {
        const contractNameR = Math.floor(Math.random() * 999) + "RCon4GetPerms";
        const contractNameW = Math.floor(Math.random() * 999) + "WCon4GetPerms";
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            },
            body: {
                "description": contractNameR,
                "type": "RETIRE",
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
            contractIdR = response.body.id;
        });
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            },
            body: {
                "description": contractNameW,
                "type": "WIPE",
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
            contractIdW = response.body.id;
            contractIdHedW = response.body.contractId;
        });
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RandomKey,
                    headers: {
                        authorization
                    },
                }).then((response) => {
                    let hederaAccountId = response.body.id
                    let hederaAccountKey = response.body.key
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Profiles + username,
                        body: {
                            hederaAccountId: hederaAccountId,
                            hederaAccountKey: hederaAccountKey
                        },
                        headers: {
                            authorization: accessToken
                        },
                        timeout: 180000
                    })
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ImportContracts,
                        headers: {
                            authorization: accessToken
                        },
                        body: {
                            "contractId": contractIdHedW,
                            "description": contractNameW
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                        contractIdRVerra = response.body.id
                        contractIdHedW = response.body.contractId
                        cy.request({
                            method: METHOD.POST,
                            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaAccountId,
                            headers: {
                                authorization
                            },
                        }).then((response) => {
                            expect(response.status).eql(STATUS_CODE.OK);
                        });
                    });
                })
            })
        })
    })

    it("Get smart-contract(retire) permissions", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdR + "/" + API.ContractPermissions,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql("3");
        });
    });

    it("Get smart-contract(retire) permissions without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdR + "/" + API.ContractPermissions,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get smart-contract(retire) permissions with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdR + "/" + API.ContractPermissions,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get smart-contract(retire) permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdR + "/" + API.ContractPermissions,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get smart-contract(retire) permissions as User - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: "Registrant",
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfContracts + contractIdR + "/" + API.ContractPermissions,
                    headers: {
                        authorization: accessToken
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                });
            });
        });
    });

    it("Get smart-contract(wipe) permissions", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdW + "/" + API.ContractPermissions,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql("15");
        });
    });

    it("Get smart-contract(wipe) permissions by Verra", () => {
        cy.request({
            method: "POST",
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: "POST",
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfContracts + contractIdRVerra + "/" + API.ContractPermissions,
                    headers: {
                        authorization: accessToken
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body).eql("8");
                });
            })
        });
    })

    it("Get smart-contract(wipe) permissions without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdW + "/" + API.ContractPermissions,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get smart-contract(wipe) permissions with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdW + "/" + API.ContractPermissions,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get smart-contract(wipe) permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdW + "/" + API.ContractPermissions,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get smart-contract(wipe) permissions as User - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: "Registrant",
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfContracts + contractIdW + "/" + API.ContractPermissions,
                    headers: {
                        authorization: accessToken
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                });
            });
        });
    });
});