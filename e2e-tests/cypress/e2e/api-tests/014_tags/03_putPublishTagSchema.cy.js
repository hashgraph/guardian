import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Tags", { tags: ['tags', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let schemaId;

    const getTagSchemas = (headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.Tags}schemas`,
            headers,
            failOnStatusCode: false,
        });

    const publishTagSchema = (schemaId, headers = {}) =>
        cy.request({
            method: METHOD.PUT,
            url: `${API.ApiServer}${API.Tags}schemas/${schemaId}/publish`,
            headers,
            failOnStatusCode: false,
            timeout: 200000,
        });

    before(() => {
        // Fetch token + get first schemaId to use in tests
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getTagSchemas({ authorization }).then((response) => {
                // Optional validation
                expect(response.status).to.be.oneOf([STATUS_CODE.OK, STATUS_CODE.SUCCESS, 200]);
                expect(response.body).to.be.an("array");

                if (!response.body.length) {
                    throw new Error("No tag schemas found to publish. Ensure test data is prepared.");
                }

                schemaId = response.body.at(0).id;
            });
        });
    });

    it("Publish the schema with the provided (internal) schema ID without auth token - Negative", () => {
        publishTagSchema(schemaId, {}).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Publish the schema with the provided (internal) schema ID with invalid auth token - Negative", () => {
        publishTagSchema(schemaId, { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Publish the schema with the provided (internal) schema ID with empty auth token - Negative", () => {
        publishTagSchema(schemaId, { authorization: "" }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Publish the schema with the provided (internal) schema ID", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            publishTagSchema(schemaId, { authorization }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });
});
