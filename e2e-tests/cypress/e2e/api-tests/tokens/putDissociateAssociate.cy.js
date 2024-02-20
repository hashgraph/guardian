import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens",{ tags: '@tokens' }, () => {
    const authorization = Cypress.env("authorization");
    it("should be able to dissociate and associate token", () => {
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
                    let tokenId = response.body[0].tokenId
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
