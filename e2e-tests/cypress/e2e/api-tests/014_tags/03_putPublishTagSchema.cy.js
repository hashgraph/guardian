import { STATUS_CODE } from "../../../support/api/api-const";
import * as Authorization from "../../../support/authorization";

context("Tags", { tags: ['tags', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let schemaId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.getTagSchemas(authorization).then((response) => {
                schemaId = response.body.at(0).id;
            });
        });
    });

    it("Publish the schema with the provided (internal) schema ID without auth token - Negative", () => {
        cy.publishTagSchema(null, schemaId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Publish the schema with the provided (internal) schema ID with invalid auth token - Negative", () => {
        cy.publishTagSchema("Bearer wqe", schemaId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Publish the schema with the provided (internal) schema ID with empty auth token - Negative", () => {
        cy.publishTagSchema("", schemaId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Publish the schema with the provided (internal) schema ID", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.publishTagSchema(authorization, schemaId).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

});