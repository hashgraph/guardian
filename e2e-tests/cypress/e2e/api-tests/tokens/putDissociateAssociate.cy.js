import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens",{ tags: '@tokens' }, () => {
    const username = "Installer";
    before(() => {
        cy.request({
            method: 'POST',
            url: API.ApiServer + 'policies/import/message',
            body: {messageId: (Cypress.env('irec_policy')),
            metadata: {
                "tools": {}
              }},
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
                    body: {policyVersion: "1.2.5"},
                    headers: {authorization},
                    timeout: 600000
                })
                    .then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK);
                        cy.request({
                            method: 'POST',
                            url: API.ApiServer + 'permissions/users/' + username + '/policies/assign',
                            headers: {authorization},
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


    const authorization = Cypress.env("authorization");
    it("Associate and disassociate the user with the provided Hedera token", () => {
        cy.request({
            method: 'POST',
            url: API.ApiServer + 'accounts/login',
            body: {
                username: username,
                password: "test",
            }
        }).then((response) => {
            cy.request({
                method: 'POST',
                url: API.ApiServer + 'accounts/access-token',
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: 'GET',
                    url: API.ApiServer + 'tokens',
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    let tokenId = response.body.at(-1).tokenId
                    cy.request({
                        method: 'PUT',
                        url: API.ApiServer + 'tokens/' + tokenId + '/associate',
                        headers: {
                            authorization: accessToken
                        }
                    })
                    cy.request({
                        method: 'PUT',
                        url: API.ApiServer + 'tokens/' + tokenId + '/dissociate',
                        headers: {
                            authorization: accessToken
                        }
                    })
                })
            })
        })
    })
})
