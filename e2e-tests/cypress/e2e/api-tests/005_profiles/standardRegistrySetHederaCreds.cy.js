import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Profiles', { tags: ['profiles', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let credentials;

    before(() => {
        cy.fixture('credentials').then((creds) => {
            credentials = creds;
        });
    });

    it('Get Standard Registry account information', () => {
        //Getting accessToken for StandardRegistry
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + 'accounts/login',
            body: {
                username: SRUsername,
                password: credentials.goodPassword
            }
        })
            .then((response) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + 'accounts/access-token',
                    body: {
                        refreshToken: response.body.refreshToken,
                    }
                }).then((response) => {
                    let accessToken = 'Bearer ' + response.body.accessToken
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + 'profiles/' + SRUsername,
                        headers: {
                            authorization: accessToken
                        }
                    })
                        .then((response) => {
                            if (response.body.confirmed === false) {
                                cy.getHederaKeys(accessToken).then((hederaAccount) => {
                                cy.request({
                                    method: 'PUT',
                                    url: API.ApiServer + 'profiles/' + SRUsername,
                                    headers: {
                                        authorization: accessToken
                                    },
                                    body: {
                                        hederaAccountId: hederaAccount.id,
                                        hederaAccountKey: hederaAccount.key,
                                        vcDocument: {
                                            geography: 'testGeography',
                                            law: 'testLaw',
                                            tags: 'testTags',
                                            type: 'StandardRegistry',
                                            '@context': []
                                        }
                                    },
                                    timeout: 200000
                                })
                                    .then(() => {
                                        //get info about StandardRegistry and put it in the file
                                        cy.request({
                                            method: METHOD.GET,
                                            url: API.ApiServer + 'profiles/' + SRUsername,
                                            headers: {
                                                authorization: accessToken
                                            }
                                        })
                                            .then((response) => {
                                                response.body.accessToken = accessToken
                                                cy.writeFile('cypress/fixtures/StandardRegistryData.json', JSON.stringify(response.body))
                                            })
                                    })
                                })
                            } else {
                                //if StandardRegistry already has hedera credentials, do not create hedera creds,
                                //just put info about StandardRegistry and accessToken in the file (just in case the file isn't presented)
                                response.body.accessToken = accessToken
                                cy.writeFile('cypress/fixtures/StandardRegistryData.json', JSON.stringify(response.body))
                            }
                        })

                })
            })
    })
})
