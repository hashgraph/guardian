
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get Modules", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "FirstAPIModule";
    const modulesUrl = `${API.ApiServer}${API.ListOfAllModules}`;

    const getModulesWithAuth = (authorization, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.GET,
            url: modulesUrl,
            headers: { authorization },
            failOnStatusCode,
        });

    const getModulesWithoutAuth = (headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: modulesUrl,
            headers,
            failOnStatusCode: false,
        });

    it("Get list of modules", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getModulesWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                let lastModule = response.body.at(0);
                expect(lastModule.name).eql(moduleName);
                expect(lastModule.description).eql(`${moduleName} desc`);
                expect(lastModule.status).eql("DRAFT");
                response.body.forEach(item => {
                    expect(item).to.have.property("_id");
                    expect(item).to.have.property("id");
                    expect(item).to.have.property("uuid");
                });
            });
        });
    });

    it("Get list of modules without auth token - Negative", () => {
        getModulesWithoutAuth().then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of modules with invalid auth token - Negative", () => {
        getModulesWithoutAuth({ authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of modules with empty auth token - Negative", () => {
        getModulesWithoutAuth({ authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
