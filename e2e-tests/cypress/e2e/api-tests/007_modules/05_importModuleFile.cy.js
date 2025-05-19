import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Export Module from File", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    let modules, lastModule, importedModule;

    it("Import module from IPFS", { tags: ['smoke', 'analytics'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("exportedModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
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
                    })
                })
        })
    });

    it("Verify import module", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                modules = response.body;
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfAllModules + modules.at(0).uuid,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    importedModule = response.body;
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.ListOfAllModules + modules.at(1).uuid,
                        headers: {
                            authorization,
                        },
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                        lastModule = response.body;

                        expect(importedModule._id).not.eql(lastModule._id)
                        delete importedModule._id;
                        delete lastModule._id;

                        expect(importedModule.configFileId).not.eql(lastModule.configFileId)
                        delete importedModule.configFileId;
                        delete lastModule.configFileId;

                        expect(importedModule.id).not.eql(lastModule.id)
                        delete importedModule.id;
                        delete lastModule.id;

                        expect(importedModule.uuid).not.eql(lastModule.uuid)
                        delete importedModule.uuid;
                        delete lastModule.uuid;

                        expect(importedModule.name).to.match(new RegExp("^" + lastModule.name + "_\\d+$", "g"))
                        delete importedModule.name
                        delete lastModule.name;

                        delete importedModule.createDate;
                        delete lastModule.createDate;
                        delete importedModule.updateDate;
                        delete lastModule.updateDate;

                        expect(importedModule).eql(lastModule);
                    })
                })
            })
        })
    });

    it("Import module from IPFS without auth token - Negative", () => {
        cy.fixture("exportedModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
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
                })
            })
    });

    it("Import module from IPFS with invalid auth token - Negative", () => {
        cy.fixture("exportedModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfAllModules + API.ImportFile,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization: "Bearer wqe",
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                })
            })
    });

    it("Import module from IPFS with empty auth token - Negative", () => {
        cy.fixture("exportedModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfAllModules + API.ImportFile,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization: "",
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                })
            })
    });
})
