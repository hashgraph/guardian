import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Profiles', { tags: ['profiles', 'thirdPool'] }, () => {
    let username = "Installer"

    it('Get Hedera account balance', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: 'GET',
                    url: API.ApiServer + 'profiles/' + Cypress.env('root_user') + '/balance',
                    headers: {
                        authorization: accessToken
                    }
                })
                    .should((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK)
                    })
            })
        })
    })
})
