import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Import Policy Themes', { tags: ['themes', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Import theme', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("exportedTheme.theme", "binary")
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Themes + API.ImportFile,
                        body: file,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                        timeout: 60000,
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.SUCCESS);
                    })
                });
        })
    });

    it("Import theme without auth token - Negative", () => {
        cy.fixture("exportedTheme.theme", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Themes + API.ImportFile,
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

    it("Import theme with invalid auth token - Negative", () => {
        cy.fixture("exportedTheme.theme", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Themes + API.ImportFile,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization: "Bearer wqe",
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            });
    })

    it("Import theme with empty auth token - Negative", () => {
        cy.fixture("exportedTheme.theme", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Themes + API.ImportFile,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization: "",
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            });
    })
})
