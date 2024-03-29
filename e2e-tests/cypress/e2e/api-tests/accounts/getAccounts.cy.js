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
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.at(0)).to.have.property("username");
        });
    });

    it("Get list of users without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Accounts,
            headers: {
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });


    it("Get list of users with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Accounts,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });


    it("Get list of users with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Accounts,
            headers: {
                authorization: "",
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });


    it("Get list of users as User - Negative", () => {
        cy.request({
            method: "POST",
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: "Registrant",
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
                    method: METHOD.GET,
                    url: API.ApiServer + API.Accounts,
                    headers: {
                        authorization: accessToken
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                });
            });
        });
    });
});
