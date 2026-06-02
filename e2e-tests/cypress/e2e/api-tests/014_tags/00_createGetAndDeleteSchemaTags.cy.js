import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Tags", { tags: ['tags', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = "schemaTag";

    let schemaId, tagId;

    before("Get schema id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Schemas,
                headers: { authorization }
            }).then((response) => {
                schemaId = response.body.at(0).id;    
            });
        });
    });

    it("Create new tag(schema) without auth token - Negative", () => {
        cy.createTag(null, tagName, schemaId, "Schema").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create new tag(schema) with invalid auth token - Negative", () => {
        cy.createTag("Bearer wqe", tagName, schemaId, "Schema").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create new tag(schema) with empty auth token - Negative", () => {
        cy.createTag("", tagName, schemaId, "Schema").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create new tag(schema)", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.createTag(authorization, tagName, schemaId, "Schema").then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                tagId = response.body.uuid;
            });
        });
    });

    it("Get schema tag", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.searchTags(authorization, schemaId, "Schema").then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body[schemaId].tags.at(0).uuid).to.eq(tagId);
            });
        });
    });

    it("Get schema tag without auth token - Negative", () => {
        cy.searchTags(null, schemaId, "Schema").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get schema tag with invalid auth token - Negative", () => {
        cy.searchTags("Bearer wqe", schemaId, "Schema").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get schema tag with empty auth token - Negative", () => {
        cy.searchTags("", schemaId, "Schema").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete schema tag without auth token - Negative", () => {
        cy.deleteTag(null, tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete schema tag with invalid auth token - Negative", () => {
        cy.deleteTag("Bearer wqe", tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete schema tag with empty auth token - Negative", () => {
        cy.deleteTag("", tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete schema tag", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.deleteTag(authorization, tagId).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

});