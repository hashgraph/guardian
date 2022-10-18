import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Accounts",  { tags: '@accounts' },() => {
    const authorization = Cypress.env("authorization");

    // TODO:
    // Negative scenario to get accounts as non RootAuthority
    it("get all users as a StandardRegistry", () => {
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.Accounts,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body[0]).to.have.property("username");
        });
    });


    it("should get 401 status code as Unauthorized", () => {
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.Accounts,
            headers: {
            },
            failOnStatusCode:false,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });


    it("should get 401 status code as Unauthorized when authorization is incorrect", () => {
        const authorizationError = "bearer 11111111111111111111@#$";
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.Accounts,
            headers: {
                authorizationError,
            },
            failOnStatusCode:false,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    

});
