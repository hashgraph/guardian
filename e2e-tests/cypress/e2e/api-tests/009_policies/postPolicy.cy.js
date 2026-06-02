
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Policies', { tags: ['policies', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const nameTag = "EmptyPolicyTag";
    const policyName = "EmptyPolicyName";

    const policiesUrl = `${API.ApiServer}${API.Policies}`;

    const createPolicyWithAuth = (authorization, body, opts = {}) =>
        cy.request({
            method: METHOD.POST,
            url: policiesUrl,
            headers: { authorization },
            body,
            timeout: opts.timeout ?? 180000,
            failOnStatusCode: opts.failOnStatusCode ?? true,
        });

    const createPolicyWithoutAuth = (body, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: policiesUrl,
            headers,
            body,
            failOnStatusCode: false,
        });

    it('Creates a new policy', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            createPolicyWithAuth(authorization, { name: policyName, policyTag: nameTag }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            });
        });
    });

    it("Creates a new policy without auth token - Negative", () => {
        createPolicyWithoutAuth({ name: policyName, policyTag: nameTag }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Creates a new policy with invalid auth token - Negative", () => {
        createPolicyWithoutAuth(
            { name: policyName, policyTag: nameTag },
            { authorization: "Bearer wqe" }
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Creates a new policy with empty auth token - Negative", () => {
        createPolicyWithoutAuth(
            { name: policyName, policyTag: nameTag },
            { authorization: "" }
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Creates a new policy by user - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            createPolicyWithAuth(
                authorization,
                { name: policyName, policyTag: nameTag },
                { failOnStatusCode: false }
            ).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

});
