import {METHOD, STATUS_CODE} from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Tags", {tags: '@tags'}, () => {
    const authorization = Cypress.env("authorization");
    const tagName = "moduleTagAPI" + Math.floor(Math.random() * 999999);
    const moduleName = "moduleNameAPI" + Math.floor(Math.random() * 999999);
    let moduleId;

    before(() => {
        //create a module for tag addition
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
            moduleId = response.body.id;
        });
    });


    it("Create new tag(module)", () => {
        cy.request({
            method: 'POST',
            url: API.ApiServer + API.Tags,
            body: {
                name: tagName,
                description: tagName,
                entity: "Module",
                target: moduleId,
            },
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
        })
    })
})
