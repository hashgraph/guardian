import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: '@schemas' }, () => {
    const authorization = Cypress.env("authorization");


    it("Push preview the schema from IPFS", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + "schemas/push/import/message/preview",
            headers: {
                authorization,
            },
            body: {
                "messageId": Cypress.env("schema_for_import")
            },
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
            expect(response.body).to.not.be.oneOf([null, ""]);
        });
    });
});
