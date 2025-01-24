import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Schemas", { tags: ['schema', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Get all system schemas by username", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.SchemasSystem + SRUsername,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body[0]).to.have.property("uuid");
            });
        });
    })
});
