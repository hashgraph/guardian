import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Tokens', { tags: ['tokens', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let policyId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                const policy = response.body.find((element) => element.description === 'iRec Description');
                if (!policy) {
                    throw new Error('No policy with description "iRec Description" was found. Prepare test data first.');
                }
                policyId = policy.id;
                // The policy may already be published by a previous run, publishing it again returns 500
                if (policy.status !== 'PUBLISH') {
                    cy.request({
                        method: 'PUT',
                        url: API.ApiServer + 'policies/' + policyId + '/publish',
                        body: { policyVersion: '1.2.5' },
                        headers: { authorization },
                        timeout: 600000
                    })
                }
            }).then(() => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + 'permissions/users/' + UserUsername + '/policies/assign',
                    headers: { authorization },
                    body: {
                        policyIds: [
                            policyId
                        ],
                        assign: true
                    }
                })
            })
        });
    })

    it('Associate and disassociate the user with the provided Hedera token', { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + 'tokens',
                // By default a User only sees tokens tied to policies assigned to them (here,
                // the iRec policy's token), which may already have NFTs minted to the account
                // by unrelated policy-workflow runs and can't be dissociated. `status=All`
                // returns the full token list instead, so we can target the fungible tokens
                // this suite itself creates (postTokens.cy.js) and stay independent of that.
                qs: {
                    status: 'All'
                },
                headers: {
                    authorization
                }
            }).then((response) => {
                const token = response.body.filter((t) => t.tokenName === 'test').at(-1);
                const tokenId = token.tokenId;
                // The `associated` flag from the list endpoint can be stale relative to the
                // actual Hedera state, so it can't be trusted to decide whether a cleanup
                // dissociate is needed. Unconditionally dissociate first and ignore the
                // result (a previous run may not have left it associated, in which case this
                // returns a 500 with TOKEN_NOT_ASSOCIATED_TO_ACCOUNT) so the test always
                // starts from a known, dissociated state.
                cy.request({
                    method: 'PUT',
                    url: API.ApiServer + 'tokens/' + tokenId + '/dissociate',
                    headers: {
                        authorization
                    },
                    failOnStatusCode: false
                });
                cy.request({
                    method: 'PUT',
                    url: API.ApiServer + 'tokens/' + tokenId + '/associate',
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.status).to.be.true;
                });
                cy.request({
                    method: 'PUT',
                    url: API.ApiServer + 'tokens/' + tokenId + '/dissociate',
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.status).to.be.true;
                });
            })
        })
    })
})
