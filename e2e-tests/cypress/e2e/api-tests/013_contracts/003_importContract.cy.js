import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/checkingMethods";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const SR2Username = Cypress.env('SR2User');
    const UserUsername = Cypress.env('User');
    const contractNameR = "FirstAPIContractR";
    const contractNameW = "FirstAPIContractW";
    let contractIdW, contractIdR;

    before("Get contract ids for import", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
                response.body.forEach(element => {
                    if (element.description == contractNameW)
                        contractIdW = element.contractId
                });
            });
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
                response.body.forEach(element => {
                    if (element.description == contractNameR)
                        contractIdR = element.contractId
                });
            });
        })
    })

    it("Import retire smart-contract", () => {
        Authorization.getAccessToken(SR2Username).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ImportContracts,
                headers: {
                    authorization,
                },
                body: {
                    "contractId": contractIdR,
                    "description": contractNameR
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.contractId).eq(contractIdR);
                expect(response.body.description).eq(contractNameR);
                expect(response.body.type).eq("RETIRE");
                expect(response.body).to.have.property("id");
                expect(response.body).to.have.property("owner");
            });
        })
    });

    it("Import retire smart-contract without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ImportContracts,
            body: {
                "contractId": contractIdR,
                "description": contractNameR
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import retire smart-contract with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ImportContracts,
            headers: {
                authorization: "Bearer wqe",
            },
            body: {
                "contractId": contractIdR,
                "description": contractNameR
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import retire smart-contract with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ImportContracts,
            headers: {
                authorization: "",
            },
            body: {
                "contractId": contractIdR,
                "description": contractNameR
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import retire smart-contract as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ImportContracts,
                headers: {
                    authorization
                },
                body: {
                    "contractId": contractIdR,
                    "description": contractNameR
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it("Import wipe smart-contract", () => {
        Authorization.getAccessToken(SR2Username).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ImportContracts,
                headers: {
                    authorization,
                },
                body: {
                    "contractId": contractIdW,
                    "description": contractNameW
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.contractId).eq(contractIdW);
                expect(response.body.description).eq(contractNameW);
                expect(response.body.type).eq("WIPE");
                expect(response.body).to.have.property("id");
                expect(response.body).to.have.property("owner");
            });
        })
    });

    it("Import wipe smart-contract without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ImportContracts,
            body: {
                "contractId": contractIdW,
                "description": contractNameW
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import wipe smart-contract with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ImportContracts,
            headers: {
                authorization: "Bearer wqe",
            },
            body: {
                "contractId": contractIdW,
                "description": contractNameW
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import wipe smart-contract with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ImportContracts,
            headers: {
                authorization: "",
            },
            body: {
                "contractId": contractIdW,
                "description": contractNameW
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import wipe smart-contract as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ImportContracts,
                headers: {
                    authorization
                },
                body: {
                    "contractId": contractIdW,
                    "description": contractNameW
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });
});
