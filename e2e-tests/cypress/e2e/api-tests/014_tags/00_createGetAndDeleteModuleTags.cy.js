import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Tags", { tags: ['tags', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = "moduleTag";

    let moduleId, tagId;

    before("Get module id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules,
                headers: { authorization },
            }).then((response) => {
                moduleId = response.body.at(0).id;    
            })
        })
    })

    it("Create new tag(module) without auth token - Negative", () => {
        cy.createTag(null, tagName, moduleId, "Module").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create new tag(module) with invalid auth token - Negative", () => {
        cy.createTag("Bearer wqe", tagName, moduleId, "Module").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create new tag(module) with empty auth token - Negative", () => {
        cy.createTag("", tagName, moduleId, "Module").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create new tag(module)", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.createTag(authorization, tagName, moduleId, "Module").then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                tagId = response.body.uuid;
            })
        });
    })

    it("Get module tag without auth token - Negative", () => {
        cy.searchTags(null, moduleId, "Module").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get module tag with invalid auth token - Negative", () => {
        cy.searchTags("Bearer wqe", moduleId, "Module").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get module tag with empty auth token - Negative", () => {
        cy.searchTags("", moduleId, "Module").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get module tag", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.searchTags(authorization, moduleId, "Module").then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body[moduleId].tags.at(0).uuid).to.eq(tagId);
            });
        })
    })

    it("Delete module tag without auth token - Negative", () => {
        cy.deleteTag(null, tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete module tag with invalid auth token - Negative", () => {
        cy.deleteTag("Bearer wqe", tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete module tag with empty auth token - Negative", () => {
        cy.deleteTag("", tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete module tag", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.deleteTag(authorization, tagId).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK)
            })
        })
    })
})