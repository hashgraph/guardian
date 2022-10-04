import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");

    it("should push to get all schemas by topicid", () => {
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.Schemas,
            headers: {
                authorization,
            },
        }).then((resp) => {
            const topicUid = resp.body[0].topicId;
            cy.request({
                method: METHOD.POST,
                url:
                    Cypress.env("api_server") +
                    API.Schemas +
                    "push/" +
                    topicUid,
                headers: {
                    authorization,
                },
            }).then((resp) => {
                expect(resp.status).eql(STATUS_CODE.SUCCESS);
            });
        });
    });
});
