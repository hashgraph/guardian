import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Tokens', { tags: ['tokens', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let tokenId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            // postTokens.cy.js/postPushTokens.cy.js normally create the "test" token, but
            // they may not have run (different order, or filtered out by tag), so this
            // stays self-sufficient by creating it here if needed.
            cy.getOrCreateTestToken(authorization, authorization).then((token) => {
                tokenId = token.tokenId;
            });
        });
    })

    it('Get user information for the token', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url:
                    API.ApiServer +
                    API.ListOfTokens +
                    tokenId +
                    '/' +
                    UserUsername +
                    '/info',
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.not.be.oneOf([null, '']);
            });
        });
    });
});
