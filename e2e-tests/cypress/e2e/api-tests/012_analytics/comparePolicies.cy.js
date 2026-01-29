
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Analytics", { tags: ['analytics', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    const URLS = {
        policies: `${API.ApiServer}${API.Policies}`,
        compare: `${API.ApiServer}${API.PolicyCompare}`,
        compareExport: `${API.ApiServer}${API.PolicyCompare}${API.ExportCSV}`,
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

    const getPoliciesWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: URLS.policies,
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

    let policyId1, policyId2, preprelastPolicy, prelastPolicy;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getPoliciesWithAuth(authorization).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                policyId1 = response.body.at(0).id;
                policyId2 = response.body.at(1).id;
            });
        });
    });

    it("Compare policies", { tags: ['smoke'] }, () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postCompareWithAuth(
                authorization,
                compareBody({ policyId1, policyId2 })
            ).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.left.id).to.eq(policyId1);
                expect(response.body.right.id).to.eq(policyId2);
                expect(response.body.total).not.null;
            });
        });
    });

    it("Compare equal policies", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            getPoliciesWithAuth(authorization).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                response.body.forEach((element) => {
                    if (element.name.startsWith("iRec_2_")) preprelastPolicy = element.id;
                    if (element.name == "iRec_2") prelastPolicy = element.id;
                });
                postCompareWithAuth(
                    authorization,
                    compareBody({ policyId1: preprelastPolicy, policyId2: prelastPolicy, eventsLvl: 2 })
                ).then((res) => {
                    expect(res.status).to.eq(STATUS_CODE.OK);
                    expect(res.body.left.id).to.eq(preprelastPolicy);
                    expect(res.body.right.id).to.eq(prelastPolicy);
                    expect(res.body.blocks.report.at(0).type).eq("FULL");
                    expect(res.body.total).eq(100);
                });
            });
        });
    });

    it("Compare policies without auth - Negative", () => {
        postCompareWithoutAuth(
            compareBody({
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
            })
        ).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare policies with empty auth - Negative", () => {
        postCompareWithoutAuth(
            compareBody({
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
            }),
            { authorization: "" }
        ).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare policies with invalid auth - Negative", () => {
        postCompareWithoutAuth(
            compareBody({
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
            }),
            { authorization: "Bearer wqe" }
        ).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare policies(Export)", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postCompareExportWithAuth(
                authorization,
                compareBody({ policyId1, policyId2 })
            ).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.include("data:text/csv");
            });
        });
    });

    it("Compare policies(Export) without auth - Negative", () => {
        postCompareExportWithoutAuth(
            compareBody({
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
            })
        ).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare policies(Export) with empty auth - Negative", () => {
        postCompareExportWithoutAuth(
            compareBody({
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
            }),
            { authorization: "" }
        ).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare policies(Export) with invalid auth - Negative", () => {
        postCompareExportWithoutAuth(
            compareBody({
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
            }),
            { authorization: "Bearer wqe" }
        ).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
