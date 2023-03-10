import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas",{ tags: '@schemas' },  () => {
    const authorization = Cypress.env("authorization");

    it("should import new schema from IPFS into the local DB", () => {
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
                    topicUid +
                    "/import/message",
                headers: {
                    authorization,
                },
                body: {
                    messageId: "1678453654.535077761",
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                expect(response.body).to.not.be.oneOf([null, ""]);
            });
        });
    });
});
