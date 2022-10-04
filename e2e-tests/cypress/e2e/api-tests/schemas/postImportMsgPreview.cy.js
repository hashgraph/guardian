import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");

    it("previews the schema from IPFS without loading it into the local DB", () => {
        cy.request({
            method: METHOD.POST,
            url: Cypress.env("api_server") + API.SchemaImportMsgPreview,
            headers: {
                authorization,
            },
            body: {
                "messageId":"1663856382.530222947"
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.not.be.oneOf([null, ""]);
        });
    });


    it("previews the schema from IPFS without loading it into the local DB", () => {
        cy.request({
            method: METHOD.POST,
            url: Cypress.env("api_server") + "schemas/push/import/message/preview",
            headers: {
                authorization,
            },
            body: {
                "messageId":"1663856382.530222947"
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
            expect(response.body).to.not.be.oneOf([null, ""]);
        });
    });
});
