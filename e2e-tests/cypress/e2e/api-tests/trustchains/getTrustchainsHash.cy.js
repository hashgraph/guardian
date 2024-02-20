import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Trustchains",  { tags: '@trustchains' }, () => {
    let username = 'Auditor'
    before(() => {
        cy.request({
            method: 'POST',
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: 'test'
            }
        }).then((responseWithRT) => {
            cy.request({
                method: "POST",
                url: API.ApiServer + "accounts/access-token",
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
                    response.body.accessToken = accessToken
                    cy.writeFile("cypress/fixtures/Auditor.json", JSON.stringify(response.body))

                })
            })
        })
    })


    // it('should builds and returns a trustchain, from the VP to the root VC document', () => {
    //     cy.request({
    //         method: 'POST',
    //         url: API.ApiServer + API.AccountsLogin,
    //         body: {
    //             username: username,
    //             password: 'test'
    //         }
    //     }).then((responseWithRT) => {
    //         cy.request({
    //             method: "POST",
    //             url: API.ApiServer + "accounts/access-token",
    //             body: {
    //                 refreshToken: responseWithRT.body.refreshToken
    //             }
    //         }).then((response) => {
    //             const accessToken = 'Bearer ' + response.body.accessToken
    //             cy.log(accessToken)
    //             cy.request({
    //                 method: 'GET',
    //                 url: API.ApiServer + API.Trustchains,
    //                 headers: {
    //                     authorization: accessToken
    //                 }
    //             }).then((response) => {
    //                 expect(response.status).to.eq(200);
    //                 let hash = response.body[0].hash;
    //                 cy.request({
    //                     method: 'GET',
    //                     url: API.ApiServer + API.Trustchains + hash,
    //                     headers: {
    //                         authorization: accessToken
    //                     }
    //                 }).then((response) => {
    //                     expect(response.status).to.eq(200);
    //                 })
    //             })
    //         })
    //     })
    // })
});
