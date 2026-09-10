import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Tokens', { tags: ['tokens', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    it('Push set the KYC flag for the user', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfTokens,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                // Restrict to the fungible tokens this suite creates, not whatever token
                // another suite (e.g. policy workflows) last created for this account.
                const tokenId = response.body.filter((t) => t.tokenName === 'test')[0].tokenId;

                cy.request({
                    method: METHOD.PUT,
                    url:
                        API.ApiServer +
                        API.ListOfTokens +
                        'push/' +
                        tokenId +
                        '/' +
                        UserUsername +
                        '/grant-kyc',
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.ACCEPTED);
                });
            });
        });
    })

    it('Push unset the KYC flag for the user', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfTokens,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                // Restrict to the fungible tokens this suite creates, not whatever token
                // another suite (e.g. policy workflows) last created for this account.
                const tokenId = response.body.filter((t) => t.tokenName === 'test')[0].tokenId;

                cy.request({
                    method: METHOD.PUT,
                    url:
                        API.ApiServer +
                        API.ListOfTokens +
                        'push/' +
                        tokenId +
                        '/' +
                        UserUsername +
                        '/revoke-kyc',
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.ACCEPTED);
                });
            });
        });
    })
});
