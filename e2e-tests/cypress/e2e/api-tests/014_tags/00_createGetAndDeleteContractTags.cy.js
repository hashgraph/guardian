import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Tags", { tags: ['tags', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = "contractTag";

    let contractId, tagId;

    before("Get contract id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: { authorization },
                qs: { type: "RETIRE" }
            }).then((response) => {
                contractId = response.body.at(0).id;
            });
        });
    });

    it("Create new tag(contract) without auth token - Negative", () => {
        cy.createTag(null, tagName, contractId, "Contract").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create new tag(contract) with invalid auth token - Negative", () => {
        cy.createTag("Bearer wqe", tagName, contractId, "Contract").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create new tag(contract) with empty auth token - Negative", () => {
        cy.createTag("", tagName, contractId, "Contract").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create new tag(contract)", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.createTag(authorization, tagName, contractId, "Contract").then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                tagId = response.body.uuid;
            });
        });
    });

    it("Get contract tag", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.searchTags(authorization, contractId, "Contract").then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body[contractId].tags.at(0).uuid).to.eq(tagId);
            });
        });
    });

    it("Get contract tag without auth token - Negative", () => {
        cy.searchTags(null, contractId, "Contract").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get contract tag with invalid auth token - Negative", () => {
        cy.searchTags("Bearer wqe", contractId, "Contract").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get contract tag with empty auth token - Negative", () => {
        cy.searchTags("", contractId, "Contract").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete contract tag without auth token - Negative", () => {
        cy.deleteTag(null, tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete contract tag with invalid auth token - Negative", () => {
        cy.deleteTag("Bearer wqe", tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete contract tag with empty auth token - Negative", () => {
        cy.deleteTag("", tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete contract tag", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.deleteTag(authorization, tagId).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

});