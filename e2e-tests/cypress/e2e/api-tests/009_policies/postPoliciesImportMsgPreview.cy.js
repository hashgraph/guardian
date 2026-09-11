import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { seededMessageId } from '../../../support/CustomHelpers/ipfsSeeding';

context('Policies', { tags: ['policies', 'secondPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyMessageId;

    before(() => {
        seededMessageId('irec_policy').then((messageId) => {
            policyMessageId = messageId;
        });
    });

    it('Preview the policy from IPFS', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportMsgPreview,
                headers: {
                    authorization,
                },
                body: {
                    'messageId': policyMessageId
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.not.be.oneOf([null, '']);
            });
        });
    })
});
