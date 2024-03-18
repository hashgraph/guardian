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
            }).then((resp) => {
                expect(resp.status).eql(STATUS_CODE.OK);
            });
        });

    it('Get User balance', () => {
        let username = "UserTest";
        cy.request({
            method: "POST",
            url: API.ApiServer + "accounts/register",
            body: {
                username: username,
                password: "test",
                password_confirmation: "test",
                role: "USER"
            }
        }).then((response) => {
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
                                    hederaAccountId: hederaAccountId,
                                    hederaAccountKey: hederaAccountKey,
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
                                }).then((resp) => {
                                    expect(resp.status).eql(STATUS_CODE.OK);
                                    expect(resp.body.unit).eql("Hbar");
                                    expect(resp.body.user.username).eql(username);
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
            failOnStatusCode:false,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
    it("Get balance with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Balance,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode:false,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
    it("Get balance with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Balance,
            headers: {
                authorization: "",
            },
            failOnStatusCode:false,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
