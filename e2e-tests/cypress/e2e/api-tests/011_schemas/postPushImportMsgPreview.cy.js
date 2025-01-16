import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Schemas", { tags: ['schema', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Push preview the schema from IPFS", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
                expect(response.status).eql(STATUS_CODE.ACCEPTED);
                expect(response.body).to.not.be.oneOf([null, ""]);
            });
        })
    });
});
