import { STATUS_CODE } from "../../../support/api/api-const";
import * as Authorization from "../../../support/authorization";

context("Tags", { tags: ['tags', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Get a list of all published schemas", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.getPublishedTagSchemas(authorization).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it("Get a list of all published schemas without auth token - Negative", () => {
        cy.getPublishedTagSchemas(null).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get a list of all published schemas with invalid auth token - Negative", () => {
        cy.getPublishedTagSchemas("Bearer wqe").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get a list of all published schemas with empty auth token - Negative", () => {
        cy.getPublishedTagSchemas("").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});