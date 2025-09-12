import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/checkingMethods";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const contractNameR = "FirstAPIContractR";
    const contractNameW = "FirstAPIContractW";
    const contractNameNeg = "FirstAPIContractNeg";

    it("Create retire contract", { tags: ['policy_labels', 'formulas', 'trustchains', 'tags'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                    "api-version":2
                },
                body: {
                    "description": contractNameR,
                    "type": "RETIRE"
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                expect(response.body).to.have.property("_id");
                expect(response.body).to.have.property("description", contractNameR);
                expect(response.body).to.have.property("contractId");
                expect(response.body).to.have.property("owner");
                expect(response.body).to.have.property("type", "RETIRE");
            });
        })
    })

    it("Create retire contract without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            failOnStatusCode: false,
            body: {
                "description": contractNameNeg,
                "type": "RETIRE",
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create retire contract with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization: "Bearer wqe",
            },
            body: {
                "description": contractNameNeg,
                "type": "RETIRE",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create retire contract with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization: "",
            },
            body: {
                "description": contractNameNeg,
                "type": "RETIRE",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create retire contract as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                body: {
                    "description": contractNameNeg,
                    "type": "RETIRE",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it("Create wipe contract", { tags: ['policy_labels', 'formulas', 'trustchains'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                    "api-version":2
                },
                body: {
                    "description": contractNameW,
                    "type": "WIPE",
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                expect(response.body).to.have.property("_id");
                expect(response.body).to.have.property("description", contractNameW);
                expect(response.body).to.have.property("contractId");
                expect(response.body).to.have.property("owner");
                expect(response.body).to.have.property("type", "WIPE");
            });
        });
    });

    it("Create wipe contract without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            failOnStatusCode: false,
            body: {
                "description": contractNameNeg,
                "type": "WIPE",
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create wipe contract with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization: "Bearer wqe",
            },
            body: {
                "description": contractNameNeg,
                "type": "WIPE",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create wipe contract with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization: "",
            },
            body: {
                "description": contractNameNeg,
                "type": "WIPE",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create wipe contract as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                body: {
                    "description": contractNameNeg,
                    "type": "WIPE",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });
});
