import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { seededMessageId } from '../../../support/CustomHelpers/ipfsSeeding';

context('Policies', { tags: ['policies', 'secondPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyMessageId;

    before(() => {
        seededMessageId('policy_with_artifacts').then((messageId) => {
            policyMessageId = messageId;
        });
    });

    it('Push import new policy and all associated artifacts from IPFS', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportMsgPush,
                body: {
                    messageId: policyMessageId,
                    metadata: {
                        'tools': {}
                    }
                },
                headers: {
                    authorization,
                },
                timeout: 180000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
            });
        })
    });
});
