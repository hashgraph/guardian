import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Contracts", { tags: ['contracts', 'firstPool'] }, () => {
    const authorization = Cypress.env("authorization");
    const importedContractName = Math.floor(Math.random() * 999) + "Con4Import";

    it("Import smart-contract", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ImportContracts,
            headers: {
                authorization,
            },
            body: {
                "contractId": Cypress.env("contract_for_import"),
                "description": importedContractName
            },
            timeout: 180000
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.contractId).eq(Cypress.env("contract_for_import"));
            expect(response.body.description).eq(importedContractName);
            expect(response.body.type).eq("WIPE");
            expect(response.body).to.have.property("id");
            expect(response.body).to.have.property("owner");
        });
    });

    it("Import smart-contract without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ImportContracts,
            body: {
                "contractId": Cypress.env("contract_for_import"),
                "description": importedContractName
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import smart-contract with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ImportContracts,
            headers: {
                authorization: "Bearer wqe",
            },
            body: {
                "contractId": Cypress.env("contract_for_import"),
                "description": importedContractName
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import smart-contract with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ImportContracts,
            headers: {
                authorization: "",
            },
            body: {
                "contractId": Cypress.env("contract_for_import"),
                "description": importedContractName
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import smart-contract as User - Negative", () => {
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
                    method: METHOD.POST,
                    url: API.ApiServer + API.ImportContracts,
                    headers: {
                        authorization: accessToken
                    },
                    body: {
                        "contractId": Cypress.env("contract_for_import"),
                        "description": importedContractName
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                    //expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                });
            });
        });
    });
});
