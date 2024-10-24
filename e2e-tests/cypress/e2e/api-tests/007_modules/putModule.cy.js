import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Modules", { tags: ['modules', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const moduleName = Math.floor(Math.random() * 999) + "APIModuleForEdit";
    let moduleId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
        })
    });

    it("Update module configuration for the specified module ID", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                expect(response.body).to.have.property("_id");
                expect(response.body).to.have.property("name", moduleName + "Test");
                expect(response.body).to.have.property("description", moduleName + "Test2");
                expect(response.body).to.have.property("status", "DRAFT");
            });
        });
    })
});
