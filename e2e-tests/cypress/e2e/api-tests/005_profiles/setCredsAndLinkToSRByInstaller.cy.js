import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context('Profiles', { tags: ['profiles', 'thirdPool', 'all'] }, () => {
    const Installer = Cypress.env('Installer');

    it('Set Hedera credentials for the Installer', () => {
        Authorization.getAccessToken(Installer).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + 'accounts/standard-registries/aggregated',
                headers: {
                    authorization
                }
            }).then((response) => {
                let SRDid = response.body[0].did
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RandomKey,
                    headers: { authorization },
                }).then((response) => {
                    cy.wait(3000)
                    let hederaAccountId = response.body.id
                    let hederaAccountKey = response.body.key
                    cy.wait(3000)
                    cy.request({
                        method: 'PUT',
                        url: API.ApiServer + 'profiles/' + Installer,
                        body: {
                            hederaAccountId: hederaAccountId,
                            hederaAccountKey: hederaAccountKey,
                            parent: SRDid
                        },
                        headers: {
                            authorization
                        },
                        timeout: 180000
                    })
                })
            })
        })
    })
})
