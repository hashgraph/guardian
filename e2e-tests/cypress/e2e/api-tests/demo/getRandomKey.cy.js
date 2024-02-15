import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Demo", { tags: '@demo' }, () => {
    const authorization = Cypress.env("authorization");
    it("should generates a new Hedera account with a random private key", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.RandomKey,
            headers: {authorization },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.ACCEPTED);
            expect(resp.body).to.have.property("taskId");
        });
    });
});
