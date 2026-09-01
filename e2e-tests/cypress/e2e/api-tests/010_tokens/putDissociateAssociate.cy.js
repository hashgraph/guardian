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
                headers: {
                    authorization
                }
            }).then((response) => {
                const token = response.body.at(-1);
                const tokenId = token.tokenId;
                // A previous run may have left the token associated, associating it again returns 500
                if (token.associated) {
                    cy.request({
                        method: 'PUT',
                        url: API.ApiServer + 'tokens/' + tokenId + '/dissociate',
                        headers: {
                            authorization
                        }
                    });
                }
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
