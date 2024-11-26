import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Analytics", { tags: ['analytics', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let moduleId1, moduleId2
    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                moduleId1 = response.body.at(0).id;
                moduleId2 = response.body.at(1).id;
            });
        });
    })

    it("Compare modules", { tags: ['smoke'] }, () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ModuleCompare,
                body: {
                    moduleId1: moduleId1,
                    moduleId2: moduleId2,
                    eventsLvl: 1,
                    propLvl: 2,
                    childrenLvl: 2,
                    idLvl: 0
                },
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.left.id).to.eq(moduleId1);
                expect(response.body.right.id).to.eq(moduleId2);
                expect(response.body.total).not.null;
            })
        })
    });

    it("Compare modules without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleCompare,
            body: {
                moduleId1: "6419853a31fe4fd0e741b3a9",
                moduleId2: "641983a931fe4fd0e741b399",
                eventsLvl: 1,
                propLvl: 2,
                childrenLvl: 2,
                idLvl: 0
            },
            headers: {
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare modules with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleCompare,
            body: {
                moduleId1: "6419853a31fe4fd0e741b3a9",
                moduleId2: "641983a931fe4fd0e741b399",
                eventsLvl: 1,
                propLvl: 2,
                childrenLvl: 2,
                idLvl: 0
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare modules with invalid auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleCompare,
            body: {
                moduleId1: "6419853a31fe4fd0e741b3a9",
                moduleId2: "641983a931fe4fd0e741b399",
                eventsLvl: 1,
                propLvl: 2,
                childrenLvl: 2,
                idLvl: 0
            },
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare modules(Export)", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ModuleCompare + API.ExportCSV,
                body: {
                    moduleId1: moduleId1,
                    moduleId2: moduleId2,
                    eventsLvl: 1,
                    propLvl: 2,
                    childrenLvl: 2,
                    idLvl: 0
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

    it("Compare modules(Export) without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleCompare + API.ExportCSV,
            body: {
                moduleId1: "6419853a31fe4fd0e741b3a9",
                moduleId2: "641983a931fe4fd0e741b399",
                eventsLvl: 1,
                propLvl: 2,
                childrenLvl: 2,
                idLvl: 0
            },
            headers: {
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare modules(Export) with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleCompare + API.ExportCSV,
            body: {
                moduleId1: "6419853a31fe4fd0e741b3a9",
                moduleId2: "641983a931fe4fd0e741b399",
                eventsLvl: 1,
                propLvl: 2,
                childrenLvl: 2,
                idLvl: 0
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare modules(Export) with invalid auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleCompare + API.ExportCSV,
            body: {
                moduleId1: "6419853a31fe4fd0e741b3a9",
                moduleId2: "641983a931fe4fd0e741b399",
                eventsLvl: 1,
                propLvl: 2,
                childrenLvl: 2,
                idLvl: 0
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