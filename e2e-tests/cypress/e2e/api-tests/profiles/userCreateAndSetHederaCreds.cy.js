import {METHOD, STATUS_CODE} from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Profiles', {tags: '@profiles'}, () => {
    const authorization = Cypress.env("authorization");
    let did

    before(() => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.StandartRegistries,
            headers: {
                authorization,
            },
        }).then((resp) => {
            did = resp.body[0].did
        });
    });

    it('Register a new user, login with it and set hedera credentials for it', () => {
        const userPassword = 'test'
        const name = (Math.floor(Math.random() * 999) + 'testUser')
        const options = {
            method: 'POST',
            url: API.ApiServer + 'accounts/register',
            body: {
                username: name,
                password: userPassword,
                password_confirmation: userPassword,
                role: 'USER'
            }
        };
        cy.request(options)
            .then((response) => {
                expect(response.status).to.eq(201)
                expect(response.body.username).to.equal(name)
                expect(response.body.role).to.equal('USER')
                cy.request({
                    method: 'POST',
                    url: API.ApiServer + 'accounts/login',
                    body: {
                        username: name,
                        password: userPassword,
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
                                method: 'PUT',
                                url: API.ApiServer + 'profiles/' + name,
                                headers: {
                                    authorization: accessToken
                                },
                                body: {
                                    hederaAccountId: "0.0.2954463",
                                    hederaAccountKey: "3030020100300706052b8104000a042204200501fd610df433a7dd202faa6864d5f270dbb129ccc6455ab5cb1ee44838cab8",
                                    parent: did
                                },
                                timeout: 200000
                            })
                        })
                    })
            })
    })

    it('Should attempt to register a new user, login with it and set invalid hedera credentials for it', () => {
        const userPassword = 'testTest'
        const name = (Math.floor(Math.random() * 999) + 'testUser')
        const options = {
            method: 'POST',
            url: API.ApiServer + 'accounts/register',
            body: {
                username: name,
                password: userPassword,
                password_confirmation: userPassword,
                role: 'USER'
            }
        };
        cy.request(options)
            .then((response) => {
                let role = response.body.role
                let username = response.body.username

                expect(response.status).to.eq(201)
                expect(username).to.equal(name)
                expect(role).to.equal('USER')

                cy.request({
                    method: 'POST',
                    url: API.ApiServer + 'accounts/login',
                    body: {
                        username: username,
                        password: userPassword,
                        password_confirmation: userPassword,
                    }
                })
                    .then((response) => {
                        expect(response.status).to.eq(200)
                        let accessToken = 'bearer ' + response.body.accessToken
                        cy.request({
                            method: 'PUT',
                            url: API.ApiServer + 'profiles/' + username,
                            headers: {
                                authorization: accessToken
                            },
                            failOnStatusCode: false,
                            body: {
                                hederaAccountId: '0.0.00000001',
                                hederaAccountKey: '302e020100300506032b657004220420aaf0eac4a188e5d7eb3897866d2b33e51ab5d7e7bfc251d736f2037a4b2075',
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
                            .then((response) => {
                                expect(response.status).to.eq(401)
                            })
                    })
            })
    })
})


