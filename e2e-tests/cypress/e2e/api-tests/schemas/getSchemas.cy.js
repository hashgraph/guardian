import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: '@schemas' },() => {
    const authorization = Cypress.env("authorization");

    it("returns all schemas", () => {
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.Schemas,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body[0]).to.have.property("id");
            expect(resp.body[0]).to.have.property("topicId");
        });
    });
});
