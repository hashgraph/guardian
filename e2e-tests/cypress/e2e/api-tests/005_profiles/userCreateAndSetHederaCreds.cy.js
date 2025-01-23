import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context('Profiles', { tags: ['profiles', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let did

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.StandartRegistries,
                headers: {
                    authorization,
                },
            }).then((response) => {
                response.body.forEach(element => {
                    if (element.username == SRUsername)
                        did = element.did
                });
            });
        })
    });

    it('Register a new user, login with it and set hedera credentials for it', () => {
        const userPassword = 'test'
        const name = (Math.floor(Math.random() * 999) + 'testUser')
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + 'accounts/register',
            body: {
                username: name,
                password: userPassword,
                password_confirmation: userPassword,
                role: 'USER'
            }
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS)
            expect(response.body.username).to.equal(name)
            expect(response.body.permissionsGroup.at(0).roleName).to.equal('Default policy user')
            Authorization.getAccessToken(name).then((authorization) => {
                cy.request({
                    method: 'PUT',
                    url: API.ApiServer + 'profiles/' + name,
                    headers: {
                        authorization
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

    it('Should attempt to register a new user, login with it and set invalid hedera credentials for it', () => {
        const userPassword = 'testTest'
        const name = (Math.floor(Math.random() * 999) + 'testUser')
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + 'accounts/register',
            body: {
                username: name,
                password: userPassword,
                password_confirmation: userPassword,
                role: 'USER'
            }
        }).then((response) => {
            let role = response.body.permissionsGroup.at(0).roleName
            let username = response.body.username

            expect(response.status).to.eq(STATUS_CODE.SUCCESS)
            expect(username).to.equal(name)
            expect(role).to.equal('Default policy user')

            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + 'accounts/login',
                body: {
                    username: username,
                    password: userPassword,
                    password_confirmation: userPassword,
                }
            })
                .then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK)
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
                            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED)
                        })
                })
        })
    })
})