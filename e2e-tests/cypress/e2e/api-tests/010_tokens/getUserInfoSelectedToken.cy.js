import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Tokens', { tags: ['tokens', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    it('Get user information for the token', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfTokens,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body[0]).to.have.property('_id');
                expect(response.body[0]).to.have.property('tokenId');
                expect(response.body[0]).to.have.property('tokenName');

                // Restrict to the fungible tokens this suite creates, not whatever token
                // another suite (e.g. policy workflows) last created for this account.
                const existing = response.body.filter((t) => t.tokenName === 'test')[0];

                // postTokens.cy.js/postPushTokens.cy.js normally create this token, but they
                // run alphabetically after this file within the same folder, so on a clean
                // environment none exists yet. Create one here to stay order-independent.
                const tokenRequest = existing
                    ? cy.wrap(existing)
                    : cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ListOfTokens,
                        headers: { authorization },
                        body: {
                            'changeSupply': true,
                            'decimals': 'string',
                            'enableAdmin': true,
                            'enableFreeze': true,
                            'enableKYC': true,
                            'enableWipe': true,
                            'initialSupply': 'string',
                            'tokenName': 'test',
                            'tokenSymbol': 'string',
                            'tokenType': 'string'
                        },
                        timeout: 180000,
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.SUCCESS);
                        return response.body;
                    });

                tokenRequest.then((token) => {
                    const topicUid = token.tokenId;

                    cy.request({
                        method: METHOD.GET,
                        url:
                            API.ApiServer +
                            API.ListOfTokens +
                            topicUid +
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
            })
        });
    });
});
