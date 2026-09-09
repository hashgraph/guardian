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
            });
        });
    })

    it('Freeze and unfreeze transfers of the specified token for the user', { tags: ['smoke'] }, () => {
        //associate token
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            // The `associated` flag from the list endpoint can be stale relative to the
            // actual Hedera state, so it can't be trusted to decide whether an associate
            // is needed. Unconditionally associate first and ignore the result (a
            // previous run may have left it associated, in which case this returns a 500
            // with TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT) so the test always starts from a
            // known, associated state before freezing.
            cy.request({
                method: 'PUT',
                url: API.ApiServer + 'tokens/' + tokenId + '/associate',
                headers: {
                    authorization
                },
                failOnStatusCode: false
            })
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.PUT,
                    url:
                        API.ApiServer +
                        API.ListOfTokens +
                        tokenId +
                        '/' +
                        UserUsername +
                        '/freeze',
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);

                    let token = response.body.tokenId;
                    let frozen = response.body.frozen;

                    expect(token).to.deep.equal(tokenId);
                    expect(frozen).to.be.true;

                    cy.request({
                        method: METHOD.PUT,
                        url:
                            API.ApiServer +
                            API.ListOfTokens +
                            tokenId +
                            '/' +
                            UserUsername +
                            '/unfreeze',
                        headers: {
                            authorization,
                        },
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);

                        let token = response.body.tokenId;
                        let frozen = response.body.frozen;

                        expect(token).to.deep.equal(tokenId);
                        expect(frozen).to.be.false;
                    });
                });

            })
        })
    })
});
