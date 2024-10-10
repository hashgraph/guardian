import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: ['schema', 'thirdPool'] }, () => {
    const authorization = Cypress.env("authorization");

    it("Get all schemas by topicId", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Schemas,
            headers: {
                authorization,
            },
        }).then((response) => {
            const topicUid = response.body[0].topicId;
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Schemas + topicUid,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body[0]).to.have.property("id");
                expect(response.body[0]).to.have.property("topicId", topicUid);
            });
        });
    });
});
