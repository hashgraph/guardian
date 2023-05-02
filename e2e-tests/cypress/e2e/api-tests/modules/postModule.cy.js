import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' },() => {
    const authorization = Cypress.env("authorization");
    const moduleName = Math.floor(Math.random() * 999) + "APIModule";
    it("create module", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules,
            headers: {
                authorization,
            },
            body: {
                "name": moduleName,
                "description": moduleName,
                "menu": "show",
                "config": {
                    "blockType": "module"
                }
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.SUCCESS);
            expect(resp.body).to.have.property("_id");
            expect(resp.body).to.have.property("name", moduleName);
            expect(resp.body).to.have.property("description", moduleName);
            expect(resp.body).to.have.property("status", "DRAFT");
        });
    });
});
