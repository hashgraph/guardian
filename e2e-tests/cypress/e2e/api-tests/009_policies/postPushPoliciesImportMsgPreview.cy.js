import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { seededMessageId } from '../../../support/CustomHelpers/ipfsSeeding';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Schemas', { tags: ['policies', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyMessageId;

    before(() => {
        seededMessageId('irec_policy').then((messageId) => {
            policyMessageId = messageId;
        });
    });

    it('Push preview the policy from IPFS', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportMsgPreviewPush,
                headers: {
                    authorization,
                },
                body: {
                    'messageId': policyMessageId
                },
                timeout: TIMEOUTS.longOperation
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
            });
        })
    });
});
