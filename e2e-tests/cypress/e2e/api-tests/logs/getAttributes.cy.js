
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Logs", () => {
    const authorization = Cypress.env("authorization");

    it("get logs attributes as a StandardRegistry", () => {
        cy.sendRequest(METHOD.GET, Cypress.env("api_server") + API.LogsAttributes, { authorization }).then(
            (resp) => {
                expect(resp.status).eql(STATUS_CODE.OK);
                expect(resp.body).to.not.be.oneOf([null, ""]);
            }
        );
    });
});
