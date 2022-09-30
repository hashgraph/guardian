import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schema", () => {
    const authorization = Cypress.env("authorization");

    it("return schema message", () => {
        cy.sendRequest(METHOD.GET, API.Schemas, {
            authorization,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            let schemaId = response.body[0].id;

            cy.request({
                method: METHOD.GET,
                url: API.Schemas + schemaId + "/export/message",
                encoding: null,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
            });
        });
    });
});