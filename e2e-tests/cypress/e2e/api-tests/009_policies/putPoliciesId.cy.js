import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { randomInt } from '../../../support/random';

context('Policies', { tags: ['policies', 'secondPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    // policyTag is unique in the DB: reusing a hardcoded one fails as soon as a run updates a policy
    // other than the one a previous run tagged
    const policyTag = `string_${randomInt(999999)}`;

    let policyId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                policyId = response.body.at(1).id;
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
