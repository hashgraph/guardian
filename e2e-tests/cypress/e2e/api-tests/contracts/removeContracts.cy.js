import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Contracts", { tags: ['contracts', 'firstPool'] }, () => {
    const authorization = Cypress.env("authorization");
    let contractIdR, contractIdW
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
            timeout: 180000
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
        });
    })

    it("Remove smart-contract(retire)", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.ListOfContracts + contractIdR,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                qs: {
                    type: "RETIRE"
                }
            }).then((response) => {
                (response.body).forEach(element => {
                    console.log(element.id)
                    expect(element.id !== contractIdR)
                });
            });
        });
    });

    it("Remove removed smart-contract(retire) - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.ListOfContracts + contractIdR,
            headers: {
                authorization,
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.ERROR);
        });
    });

    it("Remove smart-contract(retire) without auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.ListOfContracts + contractIdR,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove smart-contract(retire) with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.ListOfContracts + contractIdR,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove smart-contract(retire) permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.ListOfContracts + contractIdR,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove smart-contract(retire) permissions as User - Negative", () => {
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
                    method: METHOD.DELETE,
                    url: API.ApiServer + API.ListOfContracts + contractIdR,
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

    it("Remove smart-contract(wipe)", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.ListOfContracts + contractIdW,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
        });
    });

    it("Remove removed smart-contract(wipe) - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.ListOfContracts + contractIdW,
            headers: {
                authorization,
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.ERROR);
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                qs: {
                    type: "WIPE"
                }
            }).then((response) => {
                (response.body).forEach(element => {
                    console.log(element.id)
                    expect(element.id !== contractIdW)
                });
            });
        });
    });

    it("Remove smart-contract(wipe) without auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.ListOfContracts + contractIdW,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove smart-contract(wipe) with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.ListOfContracts + contractIdW,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove smart-contract(wipe) with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.ListOfContracts + contractIdW,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove smart-contract(wipe) as User - Negative", () => {
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
                    method: METHOD.DELETE,
                    url: API.ApiServer + API.ListOfContracts + contractIdW,
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
