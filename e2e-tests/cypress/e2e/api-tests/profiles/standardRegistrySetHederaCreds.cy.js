import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import {checkForRemovedStyleOptions} from "cypress/mount-utils";


context('Profiles', { tags: '@profiles' },() => {

    it('Get Standard Registry account information', () => {
        //Getting accessToken for StandardRegistry
        let username = 'StandardRegistry'
        cy.request({
            method: 'POST',
            url: API.ApiServer + 'accounts/login',
            body: {
                username: username,
                password: 'test'
            }
        })
            .then((response) => {
                cy.request({
                    method: 'POST',
                    url: API.ApiServer + 'accounts/access-token',
                    body: {
                        refreshToken: response.body.refreshToken,
                    }
                }).then((response) => {
                    let accessToken = 'Bearer ' + response.body.accessToken
                    cy.request({
                        method: 'GET',
                        url: API.ApiServer + 'profiles/' + username,
                        headers: {
                            authorization: accessToken
                        }
                    })
                        .then((response) => {
                            if (response.body.confirmed === false) {
                                cy.request({
                                    method: 'PUT',
                                    url: API.ApiServer + 'profiles/' + username,
                                    headers: {
                                        authorization: accessToken
                                    },
                                    body: {
                                        hederaAccountId: '0.0.3763210',
                                        hederaAccountKey: '302e020100300506032b657004220420a11e17f31581cecd57858121865fa51c965a3f8491f29f523f6161188e6a8921',
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
                                            method: 'GET',
                                            url: API.ApiServer + 'profiles/' + username,
                                            headers: {
                                                authorization: accessToken
                                            }
                                        })
                                            .then((response) => {
                                                response.body.accessToken = accessToken
                                                cy.writeFile("cypress/fixtures/StandardRegistryData.json", JSON.stringify(response.body))
                                            })
                                    })
                            } else {
                                //if StandardRegistry already has hedera credentials, do not create hedera creds,
                                //just put info about StandardRegistry and accessToken in the file (just in case the file isn't presented)
                                response.body.accessToken = accessToken
                                cy.writeFile("cypress/fixtures/StandardRegistryData.json", JSON.stringify(response.body))
                            }
                        })

                })
            })
    })
})
