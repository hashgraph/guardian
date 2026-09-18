import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { seededMessageId } from '../../../support/CustomHelpers/ipfsSeeding';

context('Policies', { tags: ['policies', 'secondPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyMessageId;

    before(() => {
        seededMessageId('policy_for_compare1').then((messageId) => {
            policyMessageId = messageId;
        });
    });

    it('Imports new policy and all associated artifacts from file', { tags: ['policy_labels', 'formulas', 'trustchains', 'contracts', 'smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportMsg,
                body: {
                    'messageId': policyMessageId },
                headers: {
                    authorization,
                },
                timeout: 600000
            })
                .then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                })
        })
    })
})
