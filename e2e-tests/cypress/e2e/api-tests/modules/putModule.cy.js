import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' },() => {
    const authorization = Cypress.env("authorization");
    const moduleName = Math.floor(Math.random() * 999) + "APIModuleForEdit";
    let moduleId;

    it("create module and get id ", () => {
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
            moduleId = resp.body.uuid;
        });
    });

    it("edit module", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.ListOfAllModules + moduleId,
            headers: {
                authorization,
            },
            body: {
                "name": moduleName + "Test",
                "description": moduleName + "Test2",
                "menu": "show",
                "config": {
                    "blockType": "module"
                }
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.SUCCESS);
            expect(resp.body).to.have.property("_id");
            expect(resp.body).to.have.property("name", moduleName + "Test");
            expect(resp.body).to.have.property("description", moduleName + "Test2");
            expect(resp.body).to.have.property("status", "DRAFT");
        });
    });
});
