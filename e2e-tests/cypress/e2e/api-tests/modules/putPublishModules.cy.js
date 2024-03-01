import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' },() => {
    const authorization = Cypress.env("authorization");
    const moduleName = Math.floor(Math.random() * 999) + "APIModuleForPublish";
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

    it("publish module", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.ListOfAllModules + moduleId + "/publish",
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
        });
    });
});
