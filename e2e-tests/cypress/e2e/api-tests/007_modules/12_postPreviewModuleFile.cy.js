import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Modules", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    let firstModule;

    before("Get module", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfAllModules + response.body.at(-1).uuid,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    firstModule = response.body;
                })
            })
        })
    });

    it("Preview the module from IPFS", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("exportedModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary)).then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfAllModules + API.ImportFile + API.Preview,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization,
                    },
                    timeout: 180000,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    let moduleOnPreview = JSON.parse(Cypress.Blob.arrayBufferToBinaryString(response.body));

                    expect(moduleOnPreview.module).to.have.property("configFileId");
                    expect(moduleOnPreview.module).to.have.property("updateDate");

                    expect(moduleOnPreview.module.codeVersion).eql(firstModule.codeVersion);
                    expect(moduleOnPreview.module.config).eql(firstModule.config);
                    expect(moduleOnPreview.module.creator).eql(firstModule.creator);
                    expect(moduleOnPreview.module.description).eql(firstModule.description);
                    expect(moduleOnPreview.module.name).eql(firstModule.name);
                    expect(moduleOnPreview.module.owner).eql(firstModule.owner);
                    expect(moduleOnPreview.module.type).eql(firstModule.type);
                });
            });
        })
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs without auth token - Negative", () => {
        cy.fixture("exportedModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary)).then((file) => {
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

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with invalid auth token - Negative", () => {
        cy.fixture("exportedModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary)).then((file) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfAllModules + API.ImportFile + API.Preview,
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

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with empty auth token - Negative", () => {
        cy.fixture("exportedModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary)).then((file) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfAllModules + API.ImportFile + API.Preview,
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
});
