import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Schemas", { tags: ['schema', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Get the schema using the json document type", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.SchemasType,
                headers: { authorization, type: "array" },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        })
    });
});
