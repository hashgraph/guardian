import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");

    it("should push to get all schemas by topicid", () => {
        cy.sendRequest(METHOD.GET, API.Schemas, { authorization }).then(
            (resp) => {
                const topicUid = resp.body[0].topicId;
                cy.sendRequest(METHOD.POST, API.Schemas + "push/" + topicUid, {
                    authorization,
                }).then((resp) => {
                    expect(resp.status).eql(STATUS_CODE.SUCCESS);
                });
            }
        );
    });
});
