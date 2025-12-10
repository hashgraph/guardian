import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Export Module as File", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    let lastModule;

    before("Get module id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                lastModule = response.body.at(0);
            })
        })
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs", { tags: ['smoke', 'analytics'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules + lastModule.uuid + "/" + API.ExportFile,
                encoding: null,
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.not.be.oneOf([null, ""]);
                cy.writeFile("cypress/fixtures/exportedModule.module",
                    Cypress.Blob.arrayBufferToBinaryString(response.body),
                    "binary");
            })
        })
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + lastModule.uuid + "/" + API.ExportFile,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + lastModule.uuid + "/" + API.ExportFile,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + lastModule.uuid + "/" + API.ExportFile,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });
});
