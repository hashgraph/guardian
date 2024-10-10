import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: ['modules', 'thirdPool'] },() => {
    const authorization = Cypress.env("authorization");
    const moduleName = Math.floor(Math.random() * 999) + "APIModuleForPublish";
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

    it("Publish the module", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.ListOfAllModules + moduleId + "/publish",
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
        });
    });
});
