import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Policies", { tags: '@policies' },() => {
    const authorization = Cypress.env("authorization");

    it("Preview the policy from IPFS", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsgPreview,
            headers: {
                authorization,
            },
            body: {
                "messageId": "1707125414.999819805" //Irec8.2
              }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.not.be.oneOf([null, ""]);
        });
    });
});
