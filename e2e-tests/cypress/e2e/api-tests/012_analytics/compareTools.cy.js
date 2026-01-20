
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Analytics", { tags: ['analytics', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    const URLS = {
        toolsImportMsg: `${API.ApiServer}${API.ToolsImportMsg}`,
        toolCompare: `${API.ApiServer}${API.ToolCompare}`,
        toolCompareExport: `${API.ApiServer}${API.ToolCompare}${API.ExportCSV}`,
    };

    const DEFAULT_COMPARE_PARAMS = Object.freeze({
        childrenLvl: "2",
        eventsLvl: "1",
        idLvl: "0",
        propLvl: "2",
    });

    const compareBody = (toolIds) => ({
        ...DEFAULT_COMPARE_PARAMS,
        toolIds,
    });

    const importToolWithAuth = (authorization, messageId, timeout = 180000) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.toolsImportMsg,
            body: { messageId },
            headers: { authorization },
            timeout,
        });

    const postToolCompareWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.toolCompare,
            headers: { authorization },
            body,
        });

    const postToolCompareWithoutAuth = (body, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.toolCompare,
            headers,
            body,
            failOnStatusCode: false,
        });

    const postToolCompareExportWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.toolCompareExport,
            headers: { authorization },
            body,
        });

    const postToolCompareExportWithoutAuth = (body, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.toolCompareExport,
            headers,
            body,
            failOnStatusCode: false,
        });

    let toolId1, toolId2;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            importToolWithAuth(authorization, Cypress.env('tool_for_compare1'), 1800000).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                toolId1 = response.body.tool.id;

                importToolWithAuth(authorization, Cypress.env('tool_for_compare2')).then((res2) => {
                    expect(res2.status).to.eq(STATUS_CODE.SUCCESS);
                    toolId2 = res2.body.tool.id;
                });
            });
        });
    });

    it("Compare tools", { tags: ['smoke'] }, () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postToolCompareWithAuth(authorization, compareBody([toolId1, toolId2])).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.left.id).to.eq(toolId1);
                expect(response.body.right.id).to.eq(toolId2);
                expect(response.body.total).not.null;
            });
        });
    });

    it("Compare tools without auth - Negative", () => {
        postToolCompareWithoutAuth(compareBody(["6419853a31fe4fd0e741b3a9", "641983a931fe4fd0e741b399"])).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare tools with empty auth - Negative", () => {
        postToolCompareWithoutAuth(compareBody(["6419853a31fe4fd0e741b3a9", "641983a931fe4fd0e741b399"]), { authorization: "" }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare tools with invalid auth - Negative", () => {
        postToolCompareWithoutAuth(compareBody(["6419853a31fe4fd0e741b3a9", "641983a931fe4fd0e741b399"]), { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare tools(Export)", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postToolCompareExportWithAuth(authorization, compareBody([toolId1, toolId2])).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.include("data:text/csv");
            });
        });
    });

    it("Compare tools(Export) without auth - Negative", () => {
        postToolCompareExportWithoutAuth(compareBody(["6419853a31fe4fd0e741b3a9", "641983a931fe4fd0e741b399"])).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare tools(Export) with empty auth - Negative", () => {
        postToolCompareExportWithoutAuth(compareBody(["6419853a31fe4fd0e741b3a9", "641983a931fe4fd0e741b399"]), { authorization: "" }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare tools(Export) with invalid auth - Negative", () => {
        postToolCompareExportWithoutAuth(compareBody(["6419853a31fe4fd0e741b3a9", "641983a931fe4fd0e741b399"]), { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });
    
});
