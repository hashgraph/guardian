import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' },() => {
    const authorization = Cypress.env("authorization");
    const moduleName = Math.floor(Math.random() * 999) + "APIModule";
    let moduleId;
    before(() => {
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
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
            moduleId = response.body.uuid;
        });
    });

    it("Get module configuration for the specified module ID", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + moduleId,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("_id");
            expect(response.body).to.have.property("name", moduleName);
            expect(response.body).to.have.property("description", moduleName);
            expect(response.body).to.have.property("status", "DRAFT");
        });
    });
});
