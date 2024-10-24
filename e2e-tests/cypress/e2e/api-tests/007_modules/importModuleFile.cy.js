import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Modules", { tags: ['modules', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    it("Imports new module and all associated artifacts", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("importDraftModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ListOfAllModules + API.ImportFile,
                        body: file,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                        timeout: 180000,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                    });
                });
        })
    });

    it("Imports new module and all associated artifacts as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.fixture("importDraftModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ListOfAllModules + API.ImportFile,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization
                        },
                        body: file,
                        failOnStatusCode: false,
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                    });
                });
        });
    });

    it("Imports new module and all associated artifacts without auth token - Negative", () => {
        cy.fixture("importDraftModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfAllModules + API.ImportFile,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            });
    })

    it("Imports new module and all associated artifacts with invalid auth token - Negative", () => {
        cy.fixture("importDraftModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfAllModules + API.ImportFile,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization: "Bearer qwe",
                    },
                    body: file,
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            });
    });

    it("Imports new module and all associated artifacts with empty auth token - Negative", () => {
        cy.fixture("importDraftModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfAllModules + API.ImportFile,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization: "",
                    },
                    body: file,
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            });
    });
});
