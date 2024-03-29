import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Analytics",  { tags: '@analytics' },() => {
    const authorization = Cypress.env("authorization");
    before(() => {
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
                })
            })
    })

    it("Compare tools", () => {
        let toolId1, toolId2
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Tools,
            headers: {
                authorization,
            }
        }).then((response) => {
            toolId1 = response.body.at(1)._id
            toolId2 = response.body.at(0)._id
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ToolCompare,
                body: {
                    toolId1: toolId1,
                    toolId2: toolId2
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
                toolId1: "6419853a31fe4fd0e741b3a9",
                toolId2: "641983a931fe4fd0e741b399"
            },
            headers: {
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare tools with empty auth - Negative", () => {
        const auth = ""
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ToolCompare,
            body: {
                toolId1: "6419853a31fe4fd0e741b3a9",
                toolId2: "641983a931fe4fd0e741b399"
            },
            headers: {
                authorization: auth,
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare tools with invalid auth - Negative", () => {
        const auth = "Bearer wqe"
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ToolCompare,
            body: {
                toolId1: "6419853a31fe4fd0e741b3a9",
                toolId2: "641983a931fe4fd0e741b399"
            },
            headers: {
                authorization: auth,
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare tools(Export)", () => {
        let toolId1, toolId2
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Tools,
            headers: {
                authorization,
            }
        }).then((response) => {
            toolId1 = response.body.at(1)._id
            toolId2 = response.body.at(0)._id
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ToolCompare + API.ExportCSV,
                body: {
                    toolId1: toolId1,
                    toolId2: toolId2
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
                toolId1: "6419853a31fe4fd0e741b3a9",
                toolId2: "641983a931fe4fd0e741b399"
            },
            headers: {
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare tools(Export) with empty auth - Negative", () => {
        const auth = ""
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ToolCompare + API.ExportCSV,
            body: {
                toolId1: "6419853a31fe4fd0e741b3a9",
                toolId2: "641983a931fe4fd0e741b399"
            },
            headers: {
                authorization: auth,
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare tools(Export) with invalid auth - Negative", () => {
        const auth = "Bearer wqe"
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ToolCompare + API.ExportCSV,
            body: {
                toolId1: "6419853a31fe4fd0e741b3a9",
                toolId2: "641983a931fe4fd0e741b399"
            },
            headers: {
                authorization: auth,
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });
});
