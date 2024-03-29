import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Policy - Import", { tags: '@policies' }, () => {
    const authorization = Cypress.env("authorization");

    it("Push import new policy and all associated artifacts from IPFS", () => {
        cy.request({
            method: "POST",
            url: `${API.ApiServer}policies/push/import/message`,
            body: {  "messageId":"1707125414.999819805" },
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
        });
    });
});
