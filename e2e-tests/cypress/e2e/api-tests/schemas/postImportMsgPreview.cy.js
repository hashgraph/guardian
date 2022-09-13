import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");

    it("previews the schema from IPFS without loading it into the local DB", () => {
        cy.request({
            method: METHOD.POST,
            url: API.SchemaImportMsgPreview,
            headers: {
                authorization,
            },
            body: {
                messageId: "1662457320.812975073",
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body[0]).to.have.property("uuid");
        });
    });
});
