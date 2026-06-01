import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Tags", { tags: ['tags', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = "policyTag";

    let policyId, tagId;

    before("Get policy id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: { authorization }
            }).then((response) => {
                policyId = response.body.at(0).id;
            });
        });
    });

    it("Create new tag(policy) without auth token - Negative", () => {
        cy.createTag(null, tagName, policyId, "Policy").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create new tag(policy) with invalid auth token - Negative", () => {
        cy.createTag("Bearer wqe", tagName, policyId, "Policy").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create new tag(policy) with empty auth token - Negative", () => {
        cy.createTag("", tagName, policyId, "Policy").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create new tag(policy)", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.createTag(authorization, tagName, policyId, "Policy").then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                tagId = response.body.uuid;
            });
        });
    });

    it("Get policy tag", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.searchTags(authorization, policyId, "Policy").then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body[policyId].tags.at(0).uuid).to.eq(tagId);
            });
        });
    });

    it("Get policy tag without auth token - Negative", () => {
        cy.searchTags(null, policyId, "Policy").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get policy tag with invalid auth token - Negative", () => {
        cy.searchTags("Bearer wqe", policyId, "Policy").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get policy tag with empty auth token - Negative", () => {
        cy.searchTags("", policyId, "Policy").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete policy tag without auth token - Negative", () => {
        cy.deleteTag(null, tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete policy tag with invalid auth token - Negative", () => {
        cy.deleteTag("Bearer wqe", tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete policy tag with empty auth token - Negative", () => {
        cy.deleteTag("", tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete policy tag", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.deleteTag(authorization, tagId).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

});