import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' },() => {
    const authorization = Cypress.env("authorization");
    it("get modules", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            if (resp.body.length != 0) {
                expect(resp.body.at(-1)).to.have.property("_id");
                expect(resp.body.at(-1)).to.have.property("uuid");
                expect(resp.body.at(-1)).to.have.property("status");
            }
        });
    });
});
