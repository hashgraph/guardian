import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    const getRetireVcs = (token) => {
        return cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.RetireContract,
            headers: token ? { authorization: token } : {},
            failOnStatusCode: false
        });
    };

    it("Returns all retire vcs", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getRetireVcs(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(0)).to.have.property("_id");
                expect(response.body.at(0)).to.have.property("owner");
                expect(response.body.at(0)).to.have.property("type");
            });
        });
    });

    it("Returns all retire vcs without auth token - Negative", () => {
        getRetireVcs(null).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns all retire vcs with invalid auth token - Negative", () => {
        getRetireVcs("Bearer wqe").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns all retire vcs with empty auth token - Negative", () => {
        getRetireVcs("").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});