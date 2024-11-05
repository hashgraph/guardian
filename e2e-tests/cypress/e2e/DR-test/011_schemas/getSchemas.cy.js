import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Schemas", { tags: ['schema', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Get all schemas", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Schemas,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body[0]).to.have.property("id");
                expect(response.body[0]).to.have.property("topicId");
            });
        })
    });
});
