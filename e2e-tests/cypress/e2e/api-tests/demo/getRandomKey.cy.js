
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Demo", () => {
    it("should generates a new Hedera account with a random private key", () => {
        cy.sendRequest(METHOD.GET,Cypress.env("api_server") +  API.RandomKey, {}).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.SUCCESS);
            expect(resp.body).to.have.property("taskId");
        });
    });
});
