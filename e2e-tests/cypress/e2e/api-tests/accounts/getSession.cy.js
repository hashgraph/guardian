import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context('Accounts', { tags: '@accounts' }, () => {
    const authorization = Cypress.env('authorization');


    it('Get user session as Standard Registry', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.AccountSession,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK)
            expect(response.body).to.have.property('id')
            expect(response.body).to.have.property('username', 'StandardRegistry')
            expect(response.body).to.have.property('password')
            expect(response.body).to.have.property('did')
            expect(response.body).to.have.property('walletToken')
            expect(response.body).to.have.property('hederaAccountId')
            expect(response.body).to.have.property('role')
        })
    })

    it('Get user session as Installer', () => {
        let username = "Installer";
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
                cy.request({
                    method: METHOD.GET,
                    url: (API.ApiServer + API.AccountSession),
                    headers: {
                        authorization: "Bearer " + response.body.accessToken
                    }
                }).then((response) => {
                    expect(response.status).to.eq(200)
                    expect(response.body).to.have.property('id')
                    expect(response.body).to.have.property('password')
                    expect(response.body.role).eq('USER')
                })
            })
        })
    })

    // it('Get user session with empty token - Negative', () => {
    //     const auth = ""
    //     cy.request({
    //         method: 'GET',
    //         url: (API.ApiServer + 'accounts/session'),
    //         headers: {
    //             authorization: auth,
    //         },
    //         failOnStatusCode: false
    //     }).then((response) => {
    //         expect(response.status).to.eq(401)
    //     })
    // })
    //
    // it('Get user session with invalid token - Negative', () => {
    //     const auth = "Bearer 21321232121"
    //     cy.request({
    //         method: 'GET',
    //         url: (API.ApiServer + 'accounts/session'),
    //         headers: {
    //             authorization: auth,
    //         },
    //         failOnStatusCode: false
    //     }).then((response) => {
    //         expect(response.status).to.eq(401)
    //     })
    // })
    //
    // it('Get user session without token - Negative', () => {
    //     cy.request({
    //         method: 'GET',
    //         url: (API.ApiServer + 'accounts/session'),
    //         headers: {
    //         },
    //         failOnStatusCode: false
    //     }).then((response) => {
    //         expect(response.status).to.eq(401)
    //     })
    // })
})
