import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Profiles', { tags: ['profiles', 'thirdPool'] },() => {
    const authorization = Cypress.env('authorization');

    it('Set Hedera credentials for the Installer', () => {
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
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: 'GET',
                    url: API.ApiServer + 'accounts/standard-registries/aggregated',
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    let SRDid = response.body[0].did
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.RandomKey,
                        headers: {authorization},
                    }).then((response) => {
                        let hederaAccountId = response.body.id
                        let hederaAccountKey = response.body.key
                        cy.request({
                            method: 'PUT',
                            url: API.ApiServer + 'profiles/' + username,
                            body: { 
                                useFireblocksSigning: false,
                                fireblocksConfig: {
                                    fireBlocksVaultId: "",
                                    fireBlocksAssetId: "",
                                    fireBlocksApiKey: "",
                                    fireBlocksPrivateiKey: ""
                                },
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
