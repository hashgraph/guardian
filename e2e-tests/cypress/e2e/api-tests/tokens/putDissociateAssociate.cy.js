import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens",{ tags: '@tokens' }, () => {
    before(() => {
        cy.request({
            method: 'POST',
            url: API.ApiServer + 'policies/import/message',
            body: {messageId: (Cypress.env('irec_policy'))},
            headers: {
                authorization,
            },
            timeout: 180000
        })
            .then(response => {
                let firstPolicyId = response.body.at(-1).id
                let firstPolicyStatus = response.body.at(-1).status
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
                    })
            })
    })


    const authorization = Cypress.env("authorization");
    it("Associate and disassociate the user with the provided Hedera token", () => {
        let username = "Installer";
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
