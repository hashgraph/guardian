import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Accounts", { tags: '@accounts' }, () => {
    const authorization = Cypress.env("authorization");
    it("Get Standard Registry balance", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Balance,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.unit).eql("Hbar");
            expect(response.body.user.username).eql("StandardRegistry");
        });
    });

    it('Get User balance', () => {
        let username = "UserTest";
        cy.request({
            method: "POST",
            url: API.ApiServer + API.AccountRegister,
            body: {
                username: username,
                password: "test",
                password_confirmation: "test",
                role: "USER"
            }
        }).then(() => {
            cy.request({
                method: "POST",
                url: API.ApiServer + API.AccountsLogin,
                body: {
                    username: username,
                    password: "test"
                }
            }).then((response) => {
                cy.request({
                    method: "POST",
                    url: API.ApiServer + API.AccessToken,
                    body: {
                        refreshToken: response.body.refreshToken
                    }
                }).then((response) => {
                    let accessToken = "Bearer " + response.body.accessToken
                    cy.request({
                        method: 'GET',
                        url: API.ApiServer + API.StandardRegistriesAggregated,
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
                            cy.request({
                                method: 'PUT',
                                url: API.ApiServer + API.Profiles + username,
                                body: {
                                    hederaAccountId: response.body.id,
                                    hederaAccountKey: response.body.key,
                                    parent: SRDid
                                },
                                headers: {
                                    authorization: accessToken
                                },
                                timeout: 180000
                            }).then((response) => {
                                cy.request({
                                    method: METHOD.GET,
                                    url: API.ApiServer + API.Balance,
                                    headers: {
                                        authorization: accessToken
                                    },
                                }).then((response) => {
                                    expect(response.status).eql(STATUS_CODE.OK);
                                    expect(response.body.unit).eql("Hbar");
                                    expect(response.body.user.username).eql(username);
                                });
                            })
                        })
                    })
                })
            })
        })

    })
    it("Get balance without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Balance,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
    it("Get balance with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Balance,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
    it("Get balance with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Balance,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
