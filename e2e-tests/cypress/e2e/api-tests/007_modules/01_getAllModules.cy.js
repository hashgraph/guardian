import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get Modules", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "FirstAPIModule";

    it("Get list of modules", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                let lastModule = response.body.at(0);
                expect(lastModule.name).eql(moduleName);
                expect(lastModule.description).eql(moduleName + " desc");
                expect(lastModule.status).eql("DRAFT");
                response.body.forEach(item => {
                    expect(item).to.have.property("_id");
                    expect(item).to.have.property("id");
                    expect(item).to.have.property("uuid");
                })
            })
        })
    });

    it("Get list of modules without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Get list of modules with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Get list of modules with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });
});