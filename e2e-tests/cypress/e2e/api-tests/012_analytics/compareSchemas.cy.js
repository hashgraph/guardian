
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Analytics", { tags: ['analytics', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    const URLS = {
        schemas: `${API.ApiServer}${API.Schemas}`,
        compare: `${API.ApiServer}${API.SchemaCompare}`,
        compareExport: `${API.ApiServer}${API.SchemaCompare}${API.ExportCSV}`,
    };

    const DEFAULT_COMPARE_PARAMS = Object.freeze({
        eventsLvl: 1,
        propLvl: 2,
        childrenLvl: 2,
        idLvl: 0,
    });

    const compareBody = (overrides) => ({
        ...DEFAULT_COMPARE_PARAMS,
        ...overrides,
    });

    const getSchemasWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: URLS.schemas,
            headers: { authorization },
        });

    const postCompareWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.compare,
            headers: { authorization },
            body,
        });

    const postCompareWithoutAuth = (body, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.compare,
            headers,
            body,
            failOnStatusCode: false,
        });

    const postCompareExportWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.compareExport,
            headers: { authorization },
            body,
        });

    const postCompareExportWithoutAuth = (body, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.compareExport,
            headers,
            body,
            failOnStatusCode: false,
        });

    let schemaId1, schemaId2;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getSchemasWithAuth(authorization).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                schemaId1 = response.body.at(0).id;
                schemaId2 = response.body.at(1).id;
            });
        });
    });

    it("Compare schemas", { tags: ['smoke'] }, () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postCompareWithAuth(
                authorization,
                compareBody({ schemaId1, schemaId2 })
            ).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.left.id).to.eq(schemaId1);
                expect(response.body.right.id).to.eq(schemaId2);
                expect(response.body.total).not.null;
            });
        });
    });

    it("Compare schemas without auth - Negative", () => {
        postCompareWithoutAuth(
            compareBody({
                schemaId1: "6419853a31fe4fd0e741b3a9",
                schemaId2: "641983a931fe4fd0e741b399",
            })
        ).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare schemas with empty auth - Negative", () => {
        postCompareWithoutAuth(
            compareBody({
                schemaId1: "6419853a31fe4fd0e741b3a9",
                schemaId2: "641983a931fe4fd0e741b399",
            }),
            { authorization: "" }
        ).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare schemas with invalid auth - Negative", () => {
        postCompareWithoutAuth(
            compareBody({
                schemaId1: "6419853a31fe4fd0e741b3a9",
                schemaId2: "641983a931fe4fd0e741b399",
            }),
            { authorization: "Bearer wqe" }
        ).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare schemas(Export)", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postCompareExportWithAuth(
                authorization,
                compareBody({ schemaId1, schemaId2 })
            ).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.include("data:text/csv");
            });
        });
    });

    it("Compare schemas(Export) without auth - Negative", () => {
        postCompareExportWithoutAuth(
            compareBody({
                schemaId1: "6419853a31fe4fd0e741b3a9",
                schemaId2: "641983a931fe4fd0e741b399",
            })
        ).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare schemas(Export) with empty auth - Negative", () => {
        postCompareExportWithoutAuth(
            compareBody({
                schemaId1: "6419853a31fe4fd0e741b3a9",
                schemaId2: "641983a931fe4fd0e741b399",
            }),
            { authorization: "" }
        ).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare schemas(Export) with invalid auth - Negative", () => {
        postCompareExportWithoutAuth(
            compareBody({
                schemaId1: "6419853a31fe4fd0e741b3a9",
                schemaId2: "641983a931fe4fd0e741b399",
            }),
            { authorization: "Bearer wqe" }
        ).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
