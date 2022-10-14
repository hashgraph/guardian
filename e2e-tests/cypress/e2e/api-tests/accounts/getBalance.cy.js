import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Accounts", { tags: '@accounts' }, () => {
    const authorization = Cypress.env("authorization");

    it("Requests current Hedera account balance", () => {
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.Balance,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
        });
    });
});
