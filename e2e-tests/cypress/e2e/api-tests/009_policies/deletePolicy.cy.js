
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['policies', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    const policiesUrl = `${API.ApiServer}${API.Policies}`;
    const deleteUrl = (id) => `${policiesUrl}${API.Async}${id}`;

    let policyId;

    const listPoliciesWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: policiesUrl,
            headers: { authorization },
        });

    const deletePolicyWithAuth = (authorization, id, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.DELETE,
            url: deleteUrl(id),
            headers: { authorization },
            failOnStatusCode,
        });

    const deletePolicyWithoutAuth = (id, headers = {}) =>
        cy.request({
            method: METHOD.DELETE,
            url: deleteUrl(id),
            headers,
            failOnStatusCode: false,
        });

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            listPoliciesWithAuth(authorization).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                policyId = response.body.at(0).id;
            });
        });
    });

    it("Deletes the policy with the provided ID by user - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            deletePolicyWithAuth(authorization, policyId, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it("Deletes the policy with the provided ID without auth token - Negative", () => {
        deletePolicyWithoutAuth(policyId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Deletes the policy with the provided ID with invalid auth token - Negative", () => {
        deletePolicyWithoutAuth(policyId, { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Deletes the policy with the provided ID with empty auth token - Negative", () => {
        deletePolicyWithoutAuth(policyId, { authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Deletes the policy with the provided ID", { tags: ['notifications', 'smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deletePolicyWithAuth(authorization, policyId).then((response) => {
                expect(response.status).eql(STATUS_CODE.ACCEPTED);
            });
        });
    });

});
