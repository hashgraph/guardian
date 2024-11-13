import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Schema", { tags: ['schema', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Export schema message", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Schemas,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                let schemaId = response.body[0].id;

                cy.request({
                    method: METHOD.GET,
                    url:
                        API.ApiServer +
                        API.Schemas +
                        schemaId +
                        "/export/message",
                    encoding: null,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                    expect(response.messageId).to.not.be.oneOf([null, ""]);
                });
            });
        })
    });
});
