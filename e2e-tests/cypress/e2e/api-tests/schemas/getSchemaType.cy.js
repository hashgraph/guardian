import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");

    it("returns schema using the json document type.", () => {
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.SchemasType,
            headers: { authorization, type: "array" },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
        });
    });
});
