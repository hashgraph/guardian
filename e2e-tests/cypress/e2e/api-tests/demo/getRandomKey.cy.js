import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Demo", { tags: '@demo' }, () => {
    const authorization = Cypress.env("authorization");
    it("should generates a random Hedera creds", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.RandomKey,
            headers: {authorization },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body).to.have.property("id");
            expect(resp.body).to.have.property("key");
        });
    });
});
