import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas",{ tags: '@schemas' },  () => {
    const authorization = Cypress.env("authorization");

    it("Push import new schema from IPFS", () => {
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
                    topicUid +
                    "/import/message",
                headers: {
                    authorization,
                },
                body: {
                    messageId: Cypress.env("schema_for_import"),
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.ACCEPTED);
                expect(response.body).to.not.be.oneOf([null, ""]);
            });
        });
    });
});
