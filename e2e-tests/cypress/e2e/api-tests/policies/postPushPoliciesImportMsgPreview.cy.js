import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: '@policies' },() => {
    const authorization = Cypress.env("authorization");

    it("Push preview the policy from IPFS", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsgPreviewPush,
            headers: {
                authorization,
            },
            body: {
                "messageId":"1707125414.999819805"
            },
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
        });
    });
});
