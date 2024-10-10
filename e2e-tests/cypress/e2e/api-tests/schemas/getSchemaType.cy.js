import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: ['schema', 'thirdPool'] }, () => {
    const authorization = Cypress.env("authorization");

    it("Get the schema using the json document type", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.SchemasType,
            headers: { authorization, type: "array" },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
        });
    });
});
