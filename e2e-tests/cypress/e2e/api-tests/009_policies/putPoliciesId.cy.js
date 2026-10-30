import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { randomInt } from '../../../support/random';

context('Policies', { tags: ['policies', 'secondPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    // policyTag is unique in the DB: reusing a hardcoded one fails as soon as a run updates a policy
    // other than the one a previous run tagged
    const runId = randomInt(999999);
    const policyTag = `string_${runId}`;
    // PUT only works on policies in DRAFT status, and the top of the list is not guaranteed to
    // be DRAFT after re-runs (other suites publish policies), so provision a dedicated policy.
    const createdPolicyName = `PolicyForPutId_${runId}`;
    const createdPolicyTag = `PolicyForPutIdTag_${runId}`;

    let policyId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
                body: {
                    name: createdPolicyName,
                    policyTag: createdPolicyTag,
                },
                timeout: 180000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                const created = response.body.find((policy) => policy.name === createdPolicyName);
                expect(created, 'created policy must be present in the returned list').to.exist;
                policyId = created.id;
            });
        })
    });

    after(() => {
        if (!policyId) return;
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.Policies + API.Async + policyId,
                headers: {
                    authorization,
                },
                failOnStatusCode: false,
            });
        })
    });

    it('Update policy configuration for the specified policy ID', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Policies + policyId,
                headers: {
                    authorization,
                },
                body: {
                    id: policyId,
                    uuid: 'string',
                    name: 'string',
                    version: 'string',
                    description: 'string',
                    topicDescription: 'string',
                    config: {},
                    status: 'string',
                    owner: 'string',
                    policyRoles: ['string'],
                    topicId: 'string',
                    policyTag,
                    policyTopics: [
                        {
                            name: 'string',
                            description: 'string',
                            type: 'string',
                            static: true,
                        },
                    ],
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        })
    });
});
