import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Analytics", { tags: ['analytics', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let toolId1, toolId2
    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ToolsImportMsg,
                body: {
                    "messageId": Cypress.env('tool_for_compare1')
                },
                headers: {
                    authorization,
                },
                timeout: 1800000
            })
                .then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                    toolId1 = response.body.tool.id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ToolsImportMsg,
                        body: {
                            "messageId": Cypress.env('tool_for_compare2')
                        },
                        headers: {
                            authorization,
                        },
                        timeout: 180000
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        toolId2 = response.body.tool.id;
                    })
                })
        })
    })

    it("Compare tools", { tags: ['smoke'] }, () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ToolCompare,
                body: {
                    childrenLvl: "2",
                    eventsLvl: "1",
                    idLvl: "0",
                    propLvl: "2",
                    toolIds: [toolId1, toolId2]
                },
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.left.id).to.eq(toolId1);
                expect(response.body.right.id).to.eq(toolId2);
                expect(response.body.total).not.null;
            })
        })
    });

    it("Compare tools without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ToolCompare,
            body: {
                toolIds: ["6419853a31fe4fd0e741b3a9", "641983a931fe4fd0e741b399"]
            },
            headers: {
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare tools with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ToolCompare,
            body: {
                toolIds: ["6419853a31fe4fd0e741b3a9", "641983a931fe4fd0e741b399"]
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare tools with invalid auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ToolCompare,
            body: {
                toolIds: ["6419853a31fe4fd0e741b3a9", "641983a931fe4fd0e741b399"]
            },
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare tools(Export)", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ToolCompare + API.ExportCSV,
                body: {
                    childrenLvl: "2",
                    eventsLvl: "1",
                    idLvl: "0",
                    propLvl: "2",
                    toolIds: [toolId1, toolId2]
                },
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.include("data:text/csv");
            })
        })
    });

    it("Compare tools(Export) without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ToolCompare + API.ExportCSV,
            body: {
                toolIds: ["6419853a31fe4fd0e741b3a9", "641983a931fe4fd0e741b399"]
            },
            headers: {
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare tools(Export) with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ToolCompare + API.ExportCSV,
            body: {
                toolIds: ["6419853a31fe4fd0e741b3a9", "641983a931fe4fd0e741b399"]
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare tools(Export) with invalid auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ToolCompare + API.ExportCSV,
            body: {
                toolIds: ["6419853a31fe4fd0e741b3a9", "641983a931fe4fd0e741b399"]
            },
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });
});
