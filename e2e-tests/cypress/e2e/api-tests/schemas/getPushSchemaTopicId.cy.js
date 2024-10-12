import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: ['schema', 'thirdPool'] },() => {
    const authorization = Cypress.env("authorization");

    it("Push create new schema", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Schemas,
            headers: {
                authorization,
            },
        }).then((response) => {
            const topicUid = response.body[0].topicId;
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
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
            });
        });
    });
});
