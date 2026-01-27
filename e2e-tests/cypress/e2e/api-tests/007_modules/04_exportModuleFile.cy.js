
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Export Module as File", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    const modulesUrl = `${API.ApiServer}${API.ListOfAllModules}`;
    const exportUrl = (uuid) => `${modulesUrl}${uuid}/${API.ExportFile}`;

    let lastModule;

    const getModulesWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: modulesUrl,
            headers: { authorization },
        });

    const getExportWithAuth = (authorization, uuid) =>
        cy.request({
            method: METHOD.GET,
            url: exportUrl(uuid),
            encoding: null,
            headers: { authorization },
            timeout: 180000,
        });

    const getExportWithoutAuth = (uuid, headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: exportUrl(uuid),
            headers,
            failOnStatusCode: false,
        });

    before("Get module id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getModulesWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                lastModule = response.body.at(0);
            });
        });
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs", { tags: ['smoke', 'analytics'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getExportWithAuth(authorization, lastModule.uuid).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.not.be.oneOf([null, ""]);
                cy.writeFile(
                    "cypress/fixtures/exportedModule.module",
                    Cypress.Blob.arrayBufferToBinaryString(response.body),
                    "binary"
                );
            });
        });
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs without auth token - Negative", () => {
        getExportWithoutAuth(lastModule.uuid).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with invalid auth token - Negative", () => {
        getExportWithoutAuth(lastModule.uuid, { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with empty auth token - Negative", () => {
        getExportWithoutAuth(lastModule.uuid, { authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
