import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context("Policies", { tags: ['policies', 'secondPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Push import new policy and all associated artifacts from IPFS", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportMsgPush,
                body: { 
                    "messageId": "1707126227.976010003" },
                headers: {
                    authorization,
                },
                timeout: 180000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
            });
        })
    });
});
