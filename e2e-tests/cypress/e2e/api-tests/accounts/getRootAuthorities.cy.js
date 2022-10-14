import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Accounts",  { tags: '@accounts' }, () => {
    const authorization = Cypress.env("authorization");

    // TODO:
    // Negative scenario to get accounts as non RootAuthority
    it("get all users as a StandardRegistry", () => {
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.RootAuthorities,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
        });
    });
});
