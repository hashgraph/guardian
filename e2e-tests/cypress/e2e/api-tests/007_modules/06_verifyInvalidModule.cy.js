
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Validate Invalid Module", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    const modulesUrl = `${API.ApiServer}${API.ListOfAllModules}`;
    const validateUrl = `${modulesUrl}${API.Validate}`;

    let invalidModule;

    const getModulesWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: modulesUrl,
            headers: { authorization },
        });

    const getModuleWithAuth = (authorization, uuid) =>
        cy.request({
            method: METHOD.GET,
            url: modulesUrl + uuid,
            headers: { authorization },
        });

    const postValidateWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: validateUrl,
            headers: { authorization },
            body,
            timeout: 180000,
        });

    const postValidateWithoutAuth = (body, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: validateUrl,
            headers,
            body,
            failOnStatusCode: false,
        });

    before("Get module id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getModulesWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                const firstUuid = response.body.at(0).uuid;
                getModuleWithAuth(authorization, firstUuid).then((res) => {
                    expect(res.status).eql(STATUS_CODE.OK);
                    invalidModule = res.body;
                    delete invalidModule._id;
                    delete invalidModule.configFileId;
                    delete invalidModule.type;
                    delete invalidModule.updateDate;
                });
            });
        });
    });

    it("Validate the module", { tags: ['analytics'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            postValidateWithAuth(authorization, invalidModule).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.module).eql(invalidModule);
                expect(response.body.results.isValid).eql(false);
            });
        });
    });

    it("Validate the module without auth token - Negative", () => {
        postValidateWithoutAuth(invalidModule).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Validate the module with invalid auth token - Negative", () => {
        postValidateWithoutAuth(invalidModule, { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Validate the module with empty auth token - Negative", () => {
        postValidateWithoutAuth(invalidModule, { authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
