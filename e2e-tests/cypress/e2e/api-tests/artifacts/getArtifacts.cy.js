import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Artifacts", { tags: '@artifacts' },() => {
    const authorization = Cypress.env("authorization");

    it("get all artifacts", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Artifacts,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
        });
    });
});
