import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Accounts",  { tags: '@accounts' },() => {
    const authorization = Cypress.env("authorization");

    it("Get list of users", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Accounts,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body[0]).to.have.property("username");
        });
    });

    it("Get list of users without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Accounts,
            headers: {
            },
            failOnStatusCode:false,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });


    it("Get list of users with incorrect auth - Negative", () => {
        const authorizationError = "bearer 11111111111111111111@#$";
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Accounts,
            headers: {
                authorizationError,
            },
            failOnStatusCode:false,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });


    it("Get list of users with empty auth - Negative", () => {
        const authorizationError = "";
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Accounts,
            headers: {
                authorizationError,
            },
            failOnStatusCode:false,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });


    it("Get list of users as User - Negative", () => {
        const username = "Registrant"
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
                    method: METHOD.GET,
                    url: API.ApiServer + API.Accounts,
                    headers: {
                        authorization: accessToken
                    },
                    failOnStatusCode: false,
                }).then((resp) => {
                    expect(resp.status).eql(STATUS_CODE.FORBIDDEN);
                });
            });
        });
    });
});
