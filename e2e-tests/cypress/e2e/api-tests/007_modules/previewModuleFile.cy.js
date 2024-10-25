import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Modules", { tags: ['modules', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    it("Previews the module from a zip file without loading it into the local DB", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("module_1682969031678.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ListOfAllModules + API.ImportFile + API.Preview,
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
        })
    });

    it("Previews the module from a zip file without loading it into the local DB as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.fixture("module_1682969031678.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ListOfAllModules + API.ImportFile + API.Preview,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                        body: file,
                        failOnStatusCode: false,
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                    });
                });
        });
    });

    it("Previews the module from a zip file without loading it into the local DB without auth token - Negative", () => {
        cy.fixture("module_1682969031678.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfAllModules + API.ImportFile + API.Preview,
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
                    url: API.ApiServer + API.ListOfAllModules + API.ImportFile + API.Preview,
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
                    url: API.ApiServer + API.ListOfAllModules + API.ImportFile + API.Preview,
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
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            let file
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfAllModules + API.ImportFile + API.Preview,
                headers: {
                    "content-type": "binary/octet-stream",
                    authorization,
                },
                body: file,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });
})
