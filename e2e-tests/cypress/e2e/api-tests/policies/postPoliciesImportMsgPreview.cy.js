import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Policies", { tags: '@policies' },() => {
    const authorization = Cypress.env("authorization");

    it("should previews the policy from IPFS without loading it into the local DB", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsgPreview,
            headers: {
                authorization,
            },
            body: {
                "messageId":"1650282926.728623821"
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.not.be.oneOf([null, ""]);
    g    });
    });
});
