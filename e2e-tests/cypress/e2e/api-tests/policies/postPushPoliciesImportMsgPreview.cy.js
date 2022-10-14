import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: '@policies' },() => {
    const authorization = Cypress.env("authorization");

    it("push should previews the policy from IPFS without loading it into the local DB", () => {
        cy.request({
            method: METHOD.POST,
            url: Cypress.env("api_server") + API.PolicisImportMsgPreviewPush,
            headers: {
                authorization,
            },
            body: {
                "messageId":"1650282926.728623821"
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
        });
    });
});
