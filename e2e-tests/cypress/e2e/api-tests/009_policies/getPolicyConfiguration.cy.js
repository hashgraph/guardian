
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['policies', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    const policiesUrl = `${API.ApiServer}${API.Policies}`;

    let policyId;

    const getPolicyWithAuth = (authorization, id) =>
        cy.request({
            method: METHOD.GET,
            url: `${policiesUrl}${id}`,
            headers: { authorization },
        });

    const getPolicyWithoutAuth = (id, headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: `${policiesUrl}${id}`,
            headers,
            failOnStatusCode: false,
        });

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: policiesUrl,
                headers: { authorization },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                policyId = response.body.at(0).id;
            });
        });
    });

    it("Retrieves policy configuration for the specified policy ID", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getPolicyWithAuth(authorization, policyId).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it("Retrieves policy configuration for the specified policy ID without auth token - Negative", () => {
        getPolicyWithoutAuth(policyId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Retrieves policy configuration for the specified policy ID with invalid auth token - Negative", () => {
        getPolicyWithoutAuth(policyId, { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Retrieves policy configuration for the specified policy ID with empty auth token - Negative", () => {
        getPolicyWithoutAuth(policyId, { authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
