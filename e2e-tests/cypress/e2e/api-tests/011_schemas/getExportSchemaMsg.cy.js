import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Schema", { tags: ['schema', 'thirdPool', 'all'] }, () => {
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
                let schema = response.body[0];

                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Schemas + schema.id + "/export/message",
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                    expect(response.messageId).to.not.be.oneOf([null, ""]);
                    expect(response.body.description).eql(schema.description);
                    expect(response.body.id).eql(schema.id);
                    expect(response.body.messageId).eql(schema.messageId);
                    expect(response.body.name).eql(schema.name);
                    expect(response.body.owner).eql(schema.owner);
                    expect(response.body.version).eql(schema.version);
                });
            });
        })
    });
});
