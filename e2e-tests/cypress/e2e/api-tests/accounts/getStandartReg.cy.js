import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Accounts",  { tags: '@accounts' }, () => {
    const authorization = Cypress.env("authorization");

    it("Get list of Standard Registries", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.StandartRegistries,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body[0]).to.have.property("username");
        });
    });

    it("Get list of Standard Registries as User", () => {
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
                    url: API.ApiServer + API.StandartRegistries,
                    headers: {
                        authorization: accessToken
                    },
                    failOnStatusCode: false,
                }).then((resp) => {
                    expect(resp.status).eql(STATUS_CODE.OK);
                    expect(resp.body.at(0).username).eq("StandardRegistry");
                });
            });
        });
    });

    it("Get list of Standard Registries without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.StandartRegistries,
            failOnStatusCode:false,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
    it("Get list of Standard Registries with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.StandartRegistries,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode:false,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
    it("Get list of Standard Registries with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.StandartRegistries,
            headers: {
                authorization: "",
            },
            failOnStatusCode:false,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
