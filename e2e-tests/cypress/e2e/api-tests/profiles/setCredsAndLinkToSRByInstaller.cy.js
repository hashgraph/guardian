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
                    let SRDid = response.body[0].did
                    cy.request({
                        method: 'PUT',
                        url: API.ApiServer + 'profiles/' + username,
                        body: {
                            hederaAccountId: "0.0.2667351",
                            hederaAccountKey: "3030020100300706052b8104000a04220420ba60bfa2abafe3e54644ba77a83d21890f58ac264d6231262105af93a376b88c",
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
