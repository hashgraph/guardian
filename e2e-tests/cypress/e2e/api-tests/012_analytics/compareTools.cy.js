
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { seededMessageId } from '../../../support/CustomHelpers/ipfsSeeding';

context('Analytics', { tags: ['analytics', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    const URLS = {
        tools: `${API.ApiServer}${API.Tools}`,
        toolsImportMsg: `${API.ApiServer}${API.ToolsImportMsg}`,
        toolCompare: `${API.ApiServer}${API.ToolCompare}`,
        toolCompareExport: `${API.ApiServer}${API.ToolCompare}${API.ExportCSV}`,
    };

    const DEFAULT_COMPARE_PARAMS = Object.freeze({
        childrenLvl: '2',
        eventsLvl: '1',
        idLvl: '0',
        propLvl: '2',
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

    const getToolsWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: URLS.tools,
            headers: { authorization },
        });

    // A tool can only be imported once: a second import of the same message fails with
    // "The tool already exists", so reuse the tool left by a previous run when present.
    const resolveToolId = (authorization, messageId, timeout) =>
        getToolsWithAuth(authorization).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
            const tools = response.body.items ?? response.body;
            const existing = tools.find((tool) => tool.messageId === messageId);
            if (existing) {
                return existing.id;
            }
            return importToolWithAuth(authorization, messageId, timeout).then((res) => {
                expect(res.status).to.eq(STATUS_CODE.SUCCESS);
                return res.body.tool.id;
            });
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

    let toolId1; let toolId2;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            seededMessageId('tool_for_compare1').then((messageId1) => {
                resolveToolId(authorization, messageId1, 1800000).then((id1) => {
                    toolId1 = id1;
                });
            });
            seededMessageId('tool_for_compare2').then((messageId2) => {
                resolveToolId(authorization, messageId2).then((id2) => {
                    toolId2 = id2;
                });
            });
        });
    });

    it('Compare tools', { tags: ['smoke'] }, () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postToolCompareWithAuth(authorization, compareBody([toolId1, toolId2])).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.left.id).to.eq(toolId1);
                expect(response.body.right.id).to.eq(toolId2);
                expect(response.body.total).not.null;
            });
        });
    });

    it('Compare tools without auth - Negative', () => {
        postToolCompareWithoutAuth(compareBody(['6419853a31fe4fd0e741b3a9', '641983a931fe4fd0e741b399'])).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Compare tools with empty auth - Negative', () => {
        postToolCompareWithoutAuth(compareBody(['6419853a31fe4fd0e741b3a9', '641983a931fe4fd0e741b399']), { authorization: '' }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Compare tools with invalid auth - Negative', () => {
        postToolCompareWithoutAuth(compareBody(['6419853a31fe4fd0e741b3a9', '641983a931fe4fd0e741b399']), { authorization: 'Bearer wqe' }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Compare tools(Export)', () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postToolCompareExportWithAuth(authorization, compareBody([toolId1, toolId2])).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.include('data:text/csv');
            });
        });
    });

    it('Compare tools(Export) without auth - Negative', () => {
        postToolCompareExportWithoutAuth(compareBody(['6419853a31fe4fd0e741b3a9', '641983a931fe4fd0e741b399'])).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Compare tools(Export) with empty auth - Negative', () => {
        postToolCompareExportWithoutAuth(compareBody(['6419853a31fe4fd0e741b3a9', '641983a931fe4fd0e741b399']), { authorization: '' }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Compare tools(Export) with invalid auth - Negative', () => {
        postToolCompareExportWithoutAuth(compareBody(['6419853a31fe4fd0e741b3a9', '641983a931fe4fd0e741b399']), { authorization: 'Bearer wqe' }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
