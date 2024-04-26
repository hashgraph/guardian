import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' },() => {
    const authorization = Cypress.env("authorization");
    it("Get modules menu", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfModules,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            if (response.body.length != 0) {
                expect(response.body.at(-1)).to.have.property("_id");
                expect(response.body.at(-1)).to.have.property("uuid");
                expect(response.body.at(-1)).to.have.property("status");
            }
        });
    });
});
