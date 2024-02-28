import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Profiles', { tags: '@profiles' },() => {
    const authorization = Cypress.env('authorization');

    it('set Creds for Installer and link it to existing SR', () => {
        //get refresh and access tokens
        let username = "Installer";
        cy.request({
            method: "POST",
            url: API.ApiServer + "accounts/login",
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: "POST",
                url: API.ApiServer + "accounts/access-token",
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                //get SR did
                cy.request({
                    method: 'GET',
                    url: API.ApiServer + 'accounts/standard-registries/aggregated',
                    body: {
                        username: username,
                        password: 'test'
                    },
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    cy.log(response.body[0].did)
                    cy.log(accessToken)
                    let SRDid = response.body[0].did
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.RandomKey,
                        headers: {authorization},
                    }).then((response) => {
                        let hederaAccountId = response.body.id
                        cy.log(response)
                        let hederaAccountKey = response.body.key
                        cy.log(response)
                        cy.request({
                            method: 'PUT',
                            url: API.ApiServer + 'profiles/' + username,
                            body: {
                                hederaAccountId: hederaAccountId,
                                hederaAccountKey: hederaAccountKey,
                                parent: SRDid
                            },
                            headers: {
                                authorization: accessToken
                            },
                            timeout: 180000
                        })
                    })
                })
            })
        })
    })
})
