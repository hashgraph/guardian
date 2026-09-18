import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Tokens', { tags: ['tokens', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let tokenId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            // postTokens.cy.js normally creates the fungible "test" token, but it may not
            // have run (different order, or filtered out by tag), so create it here if
            // needed to stay self-sufficient.
            cy.getOrCreateTestToken(authorization, authorization).then((token) => {
                tokenId = token.tokenId;
            }).then(() => {
                Authorization.getAccessToken(UserUsername).then((authorization) => {
                    // Granting KYC requires the account to already be associated with the
                    // token. putFreezeUnfreeze.cy.js normally leaves the token associated,
                    // but it may not have run (different order, or filtered out by tag), so
                    // associate here too. Ignore the result: a previous run may have already
                    // left it associated, in which case this returns a 500 with
                    // TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT.
                    cy.request({
                        method: 'PUT',
                        url: API.ApiServer + 'tokens/' + tokenId + '/associate',
                        headers: {
                            authorization
                        },
                        failOnStatusCode: false
                    });
                });
            });
        });
    })

    it('Set and unset the KYC flag for the user', { tags: ['smoke'] }, () => {
        //grant kyc
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url:
                    API.ApiServer +
                    API.ListOfTokens +
                    tokenId +
                    '/' +
                    UserUsername +
                    '/grant-kyc',
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                let token = response.body.tokenId;
                let kyc = response.body.kyc;
                expect(token).to.deep.equal(tokenId);
                expect(kyc).to.be.true;
                cy.request({
                    method: METHOD.PUT,
                    url:
                        API.ApiServer +
                        API.ListOfTokens +
                        tokenId +
                        '/' +
                        UserUsername +
                        '/revoke-kyc',
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    let token = response.body.tokenId;
                    let kyc = response.body.kyc;
                    expect(token).to.deep.equal(tokenId);
                    expect(kyc).to.be.false;
                });
            });
        })
    })
});
