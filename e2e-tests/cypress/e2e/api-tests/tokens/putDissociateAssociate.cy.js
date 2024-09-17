import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Tokens", { tags: ['tokens', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: 'POST',
                url: API.ApiServer + 'policies/import/message',
                body: {
                    messageId: (Cypress.env('irec_policy')),
                    metadata: {
                        "tools": {}
                    }
                },
                headers: {
                    authorization,
                },
                timeout: 180000
            })
                .then(response => {
                    let firstPolicyId = response.body.at(0).id
                    let firstPolicyStatus = response.body.at(0).status
                    expect(firstPolicyStatus).to.equal('DRAFT')
                    cy.request({
                        method: 'PUT',
                        url: API.ApiServer + 'policies/' + firstPolicyId + '/publish',
                        body: { policyVersion: "1.2.5" },
                        headers: { authorization },
                        timeout: 600000
                    })
                        .then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                            cy.request({
                                method: 'POST',
                                url: API.ApiServer + 'permissions/users/' + UserUsername + '/policies/assign',
                                headers: { authorization },
                                body: {
                                    policyIds: [
                                        firstPolicyId
                                    ],
                                    assign: true
                                }
                            })
                        })
                })
        })
    })


    it("Associate and disassociate the user with the provided Hedera token", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: 'GET',
                url: API.ApiServer + 'tokens',
                headers: {
                    authorization
                }
            }).then((response) => {
                let tokenId = response.body.at(-1).tokenId
                cy.request({
                    method: 'PUT',
                    url: API.ApiServer + 'tokens/' + tokenId + '/associate',
                    headers: {
                        authorization
                    }
                })
                cy.request({
                    method: 'PUT',
                    url: API.ApiServer + 'tokens/' + tokenId + '/dissociate',
                    headers: {
                        authorization
                    }
                })
            })
        })
    })
})
