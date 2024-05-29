import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' }, () => {
    const authorization = Cypress.env("authorization");

    it("Previews the module from a zip file without loading it into the local DB", () => {
        cy.fixture("module_1682969031678.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ModuleImportFilePreview,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization,
                    },
                    body: file,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    let responseJson = JSON.parse(Cypress.Blob.arrayBufferToBinaryString(response.body))
                    expect(responseJson.module).to.have.property("name");
                    expect(responseJson.module).to.have.property("description");
                    expect(responseJson.module).to.have.property("creator");
                    expect(responseJson.module).to.have.property("owner");
                    expect(responseJson.module.config.blockType).eql("module");
                });
            })
    });

    it("Previews the module from a zip file without loading it into the local DB as User - Negative", () => {
        cy.fixture("module_1682969031678.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
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
                            url: API.ApiServer + API.ModuleImportFilePreview,
                            headers: {
                                "content-type": "binary/octet-stream",
                                authorization: accessToken,
                            },
                            body: file,
                            failOnStatusCode: false,
                        }).then((response) => {
                            expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                        });
                    });
                });

            })
    });

    it("Previews the module from a zip file without loading it into the local DB without auth token - Negative", () => {
        cy.fixture("module_1682969031678.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ModuleImportFilePreview,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            })
    });

    it("Previews the module from a zip file without loading it into the local DB with invalid auth token - Negative", () => {
        cy.fixture("module_1682969031678.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ModuleImportFilePreview,
                    headers: {
                        authorization: "Bearer wqe",
                    },
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            })
    });

    it("Previews the module from a zip file without loading it into the local DB with empty auth token - Negative", () => {
        cy.fixture("module_1682969031678.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ModuleImportFilePreview,
                    headers: {
                        authorization: "",
                    },
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            })
    });

    it("Previews the module from a zip file without loading it into the local DB with empty file - Negative", () => {
        let file
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleImportFilePreview,
            headers: {
                "content-type": "binary/octet-stream",
                authorization,
            },
            body: file,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.ERROR);
            expect(response.body.message).eql("End of data reached (data length = 0, asked index = 4). Corrupted zip ?");
        });
    });
});
