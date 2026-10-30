
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { randomInt } from '../../../support/random';

context('Policies', { tags: ['policies', 'secondPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const policyName = 'UpdatedPolicyName';

    const policiesUrl = `${API.ApiServer}${API.Policies}`;

    // PUT only works on policies in DRAFT status, and the top of the list is not guaranteed to
    // be DRAFT after re-runs (other suites publish policies), so provision a dedicated policy.
    const runId = randomInt(999999);
    const createdPolicyName = `PolicyForPut_${runId}`;
    const createdPolicyTag = `PolicyForPutTag_${runId}`;

    let policyId;

    const putPolicyWithAuth = (authorization, id, body, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.PUT,
            url: `${policiesUrl}${id}`,
            headers: { authorization },
            body,
            failOnStatusCode,
        });

    const putPolicyWithoutAuth = (id, headers = {}) =>
        cy.request({
            method: METHOD.PUT,
            url: `${policiesUrl}${id}`,
            headers,
            failOnStatusCode: false,
        });

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: policiesUrl,
                headers: { authorization },
                body: { name: createdPolicyName, policyTag: createdPolicyTag },
                timeout: 180000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                const created = response.body.find((policy) => policy.name === createdPolicyName);
                expect(created, 'created policy must be present in the returned list').to.exist;
                policyId = created.id;
            });
        });
    });

    after(() => {
        if (!policyId) return;
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
                url: `${policiesUrl}${API.Async}${policyId}`,
                headers: { authorization },
                failOnStatusCode: false,
            });
        });
    });

    it('Updates policy configuration for the specified policy ID', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            putPolicyWithAuth(authorization, policyId, {
                id: policyId,
                name: policyName,
                config: {},
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it('Updates policy configuration for the specified policy ID by user - Negative', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            putPolicyWithAuth(authorization, policyId, undefined, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it('Updates policy configuration for the specified policy ID without auth token - Negative', () => {
        putPolicyWithoutAuth(policyId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Updates policy configuration for the specified policy ID with invalid auth token - Negative', () => {
        putPolicyWithoutAuth(policyId, { authorization: 'Bearer wqe' }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Updates policy configuration for the specified policy ID with empty auth token - Negative', () => {
        putPolicyWithoutAuth(policyId, { authorization: '' }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Updates policy configuration for the specified policy ID with invalid policy id - Negative', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            putPolicyWithAuth(authorization, `${policyId}abrakadabra`, {
                id: policyId,
                name: policyName,
                config: {},
            }, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql('Internal server error');
            });
        });
    });

    it('Updates policy configuration for the specified policy ID with invalid policy configuration - Negative', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            putPolicyWithAuth(authorization, policyId, {
                id: policyId,
                name: policyName,
            }, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql('You must pass a non-undefined value to the property config of entity Policy.');
            });
        });
    });

});
