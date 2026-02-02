
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Policies', { tags: ['policies', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const nameTag = "EmptyPolicyTagByAsync";
    const policyName = "EmptyPolicyNameByAsync";

    const policiesAsyncUrl = `${API.ApiServer}${API.Policies}${API.Async}`;

    const createPolicyAsyncWithAuth = (authorization, body, opts = {}) =>
        cy.request({
            method: METHOD.POST,
            url: policiesAsyncUrl,
            headers: { authorization },
            body,
            timeout: opts.timeout ?? 180000,
            failOnStatusCode: opts.failOnStatusCode ?? true,
        });

    const createPolicyAsyncWithoutAuth = (body, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: policiesAsyncUrl,
            headers,
            body,
            failOnStatusCode: false,
        });

    it('Creates a new policy - async', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            createPolicyAsyncWithAuth(authorization, { name: policyName, policyTag: nameTag }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
            });
        });
    });

    it("Creates a new policy without auth token - async - Negative", () => {
        createPolicyAsyncWithoutAuth({ name: policyName, policyTag: nameTag }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Creates a new policy with invalid auth token - async - Negative", () => {
        createPolicyAsyncWithoutAuth(
            { name: policyName, policyTag: nameTag },
            { authorization: "Bearer wqe" }
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Creates a new policy with empty auth token - async - Negative", () => {
        createPolicyAsyncWithoutAuth(
            { name: policyName, policyTag: nameTag },
            { authorization: "" }
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Creates a new policy by user - async - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            createPolicyAsyncWithAuth(
                authorization,
                { name: policyName, policyTag: nameTag },
                { failOnStatusCode: false }
            ).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

});
