import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as IpfsSeeding from '../../../support/CustomHelpers/ipfsSeeding';

context('Schemas', { tags: ['schema', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let schemaMessageId;

    // The schema is published here instead of reusing a hardcoded message ID, whose IPFS content
    // can be unpinned at any time. The preview below still goes through Hedera + IPFS.
    before('Publish schema to IPFS', () => {
        IpfsSeeding.publishSchema(SRUsername).then(({ messageId }) => {
            schemaMessageId = messageId;
        });
    });

    it('Push preview the schema from IPFS', () => {
        expect(schemaMessageId, 'message ID of the schema published by the setup').to.be.a('string');
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + 'schemas/push/import/message/preview',
                headers: {
                    authorization,
                },
                body: {
                    'messageId': schemaMessageId
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
                expect(response.body).to.not.be.oneOf([null, '']);
            });
        })
    });
});
