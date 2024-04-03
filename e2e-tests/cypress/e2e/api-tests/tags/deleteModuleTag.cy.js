import {METHOD, STATUS_CODE} from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Tags", {tags: '@tags'}, () => {
    const tagName = "moduleTagAPI" + Math.floor(Math.random() * 999999);
    const moduleName = "moduleNameAPI" + Math.floor(Math.random() * 999999);
    const authorization = Cypress.env("authorization");
    let tagId;
    let moduleId;

    before(() => {
        //create module and tag for tag deletion
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
                tagId = response.body.uuid;
            })
        });
    });


    it("Delete tag(module)", () => {
        cy.request({
            method: 'DELETE',
            url: API.ApiServer + API.Tags + tagId,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK)
        })
    })
})
