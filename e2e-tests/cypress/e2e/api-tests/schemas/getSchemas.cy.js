import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");

    it("returns all schemas", () => {
        cy.sendRequest(METHOD.GET, Cypress.env("api_server") + API.Schemas, { authorization }).then(
            (resp) => {
                expect(resp.status).eql(STATUS_CODE.OK);
                expect(resp.body[0]).to.have.property("id");
                expect(resp.body[0]).to.have.property("topicId");
            }
        );
    });
    
});
