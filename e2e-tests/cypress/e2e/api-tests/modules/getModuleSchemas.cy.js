import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' }, () => {
    const authorization = Cypress.env("authorization");

    it("Get modules schemas", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + API.Schemas,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
        });
    });
});
