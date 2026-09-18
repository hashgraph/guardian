import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Tokens', { tags: ['tokens', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let policyId;
    let tokenId;

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
                const found = response.body.find((element) => element.description === 'iRec Description');
                // Normally this policy is imported by 009_policies/postPoliciesImportFile.cy.js,
                // which runs before this folder in a full suite run. When 010_tokens is run in
                // isolation that import never happens, so import it here to stay self-sufficient.
                if (found) {
                    return cy.wrap(found);
                }
                return cy.importPolicyFile(authorization, 'exportedPolicy.policy').then(() => {
                    return cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies,
                        headers: { authorization },
                    }).then((response) => {
                        const imported = response.body.find((element) => element.description === 'iRec Description');
                        if (!imported) {
                            throw new Error('Failed to import the "iRec Description" policy required by this suite.');
                        }
                        return imported;
                    });
                });
            }).then((policy) => {
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
            }).then(() => {
                // postTokens.cy.js normally creates the fungible "test" token, but it may
                // not have run (different order, or filtered out by tag), so create it here
                // if needed to stay self-sufficient.
                return cy.getOrCreateTestToken(authorization, authorization);
            }).then((token) => {
                tokenId = token.tokenId;
            })
        });
    })

    it('Associate and disassociate the user with the provided Hedera token', { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
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
