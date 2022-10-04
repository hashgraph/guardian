import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Logs", () => {
    const authorization = Cypress.env("authorization");

    it("get logs attributes as a StandardRegistry", () => {
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.LogsAttributes,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body).to.not.be.oneOf([null, ""]);
        });
    });
});
