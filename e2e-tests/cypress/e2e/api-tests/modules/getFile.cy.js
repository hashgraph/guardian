import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: ['modules', 'thirdPool'] },() => {
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

    it("Create and export module as file", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + moduleId + "/" + API.ExportMessage,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.not.be.oneOf([null, ""]);
        });
    });
});
