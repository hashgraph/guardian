
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { randomInt } from '../../../support/random';

context('Policies', { tags: ['policies', 'secondPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    // policyTag is unique in the DB, so a hardcoded one makes every run after the first fail with a
    // duplicate key error
    const runId = randomInt(999999);
    const nameTag = `EmptyPolicyTagByAsync_${runId}`;
    const policyName = `EmptyPolicyNameByAsync_${runId}`;

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

    it('Creates a new policy without auth token - async - Negative', () => {
        createPolicyAsyncWithoutAuth({ name: policyName, policyTag: nameTag }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Creates a new policy with invalid auth token - async - Negative', () => {
        createPolicyAsyncWithoutAuth(
            { name: policyName, policyTag: nameTag },
            { authorization: 'Bearer wqe' }
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Creates a new policy with empty auth token - async - Negative', () => {
        createPolicyAsyncWithoutAuth(
            { name: policyName, policyTag: nameTag },
            { authorization: '' }
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Creates a new policy by user - async - Negative', () => {
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
