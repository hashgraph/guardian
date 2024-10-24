import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Trustchains", { tags: ['trustchains', 'thirdPool'] },() => {
    let username = 'Auditor'
    before(() => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: 'test'
            }
        }).then((responseWithRT) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: responseWithRT.body.refreshToken
                }
            }).then((response) => {
                const accessToken = 'Bearer ' + response.body.accessToken
                cy.request({
                    method: 'GET',
                    url: API.ApiServer + 'profiles/' + username,
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    cy.writeFile("cypress/fixtures/Auditor.json", JSON.stringify(response.body))
                })
            })
        })
    })


    it('Get all VP documents', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: 'test'
            }
        }).then((responseWithRT) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer+API.AccessToken,
                body: {
                    refreshToken: responseWithRT.body.refreshToken
                }
            }).then((response) => {
                const accessToken = 'Bearer ' + response.body.accessToken
                cy.request({
                    method: 'GET',
                    url: API.ApiServer+API.Trustchains,
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                })
            })
        })
    })
});

