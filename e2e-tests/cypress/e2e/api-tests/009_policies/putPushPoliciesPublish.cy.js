import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Policies', { tags: ['policies', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

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
                policyId = response.body.at(0).id;
            });
        })
    });

    it('Push publish the policy with the specified (internal) policy ID', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: 'PUT',
                url: API.ApiServer + 'policies/push/' + policyId + '/publish',
                body: { policyVersion: '1.2.5' },
                headers: { authorization },
                timeout: TIMEOUTS.longOperation
            })
                .then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
                })
        })
    })
})
