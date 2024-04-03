import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: '@schemas' },() => {
    const authorization = Cypress.env("authorization");

    it("Push create new schema", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Schemas,
            headers: {
                authorization,
            },
        }).then((resp) => {
            const topicUid = resp.body[0].topicId;
            cy.request({
                method: METHOD.POST,
                url:
                API.ApiServer +
                    API.Schemas +
                    "push/" +
                    topicUid,
                headers: {
                    authorization,
                },
            }).then((resp) => {
                expect(resp.status).to.eq(STATUS_CODE.ACCEPTED);
            });
        });
    });
});
