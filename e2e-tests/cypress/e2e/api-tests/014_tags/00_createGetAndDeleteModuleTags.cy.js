import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context("Tags", { tags: ['tags', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = "moduleTag";

    let moduleId, tagId;

    before("Get module id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfModules,
                headers: {
                    authorization,
                },
            }).then((response) => {
                moduleId = response.body.at(0).id;    
            })
        })
    })

    it("Create new tag(module)", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
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
                tagId = response.body.uuid;
            })
        });
    })

    it("Get module tag", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Tags + "search",
                headers: {
                    authorization,
                },
                body: {
                    entity: "Module",
                    targets: [moduleId]
                },
                timeout: 200000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body[moduleId].tags.at(0).uuid).to.eq(tagId);
            });
        })
    })

    it("Delete module tag", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
})
