import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Analytics", { tags: ['analytics', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "FirstAPIModule";

    //for any modules compare
    let lastModule, prelastModule;

    //for partly equal comparing
    let moduleId, moduleId2;

    //for full equal comparing
    let moduleIdClone;

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
                lastModule = response.body.at(0).id;
                prelastModule = response.body.at(1).id;
                response.body.forEach(element => {
                    if (element.name === moduleName)
                        moduleId = element.id;
                    else if (new RegExp("^" + moduleName + "_\\d+$", "g").test(element.name))
                        moduleId2 = element.id;
                });
            });
            cy.fixture("exportedModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ListOfAllModules + API.ImportFile,
                        body: file,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                        timeout: 180000,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        let moduleOnPreview = JSON.parse(Cypress.Blob.arrayBufferToBinaryString(response.body));
                        moduleIdClone = moduleOnPreview.id;
                    })
                })
        });
    })

    it("Compare any modules", { tags: ['smoke'] }, () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ModuleCompare,
                body: {
                    moduleId1: lastModule,
                    moduleId2: prelastModule,
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

                expect(response.body.left.id).to.eq(lastModule);
                expect(response.body.right.id).to.eq(prelastModule);
                expect(response.body.total).to.match(new RegExp("^([0-9][0-9])|100$"));
            })
        })
    });

    it("Compare partly equal modules", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ModuleCompare,
                body: {
                    moduleId1: moduleId,
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

                expect(response.body.left).eql({
                    id: moduleId,
                    name: moduleName,
                    description: moduleName + " desc"
                });

                expect(response.body.right.id).to.eq(moduleId2);
                expect(response.body.right.description).to.eq(moduleName + " desc");
                expect(response.body.right.name).to.match(new RegExp("^" + moduleName + "_\\d+$", "g"));

                expect(response.body.blocks.report.at(0).total_rate).eql("100%");
                expect(response.body.blocks.report.at(0).type).eql("PARTLY");
                expect(response.body.total).to.match(new RegExp("^([0-9][0-9])$"));
            })
        })
    });

    it("Compare full equal modules", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ModuleCompare,
                body: {
                    moduleId1: moduleId,
                    moduleId2: moduleIdClone,
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

                expect(response.body.left.id).to.eq(moduleId);
                expect(response.body.left.description).to.eq(moduleName + " desc");
                expect(response.body.left.name).to.match(new RegExp("^" + moduleName, "g"));

                expect(response.body.right.id).to.eq(moduleIdClone);
                expect(response.body.right.description).to.eq(moduleName + " desc");
                expect(response.body.right.name).to.match(new RegExp("^" + moduleName + "_\\d+$", "g"));

                expect(response.body.total).eql(100);
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
                    moduleId1: moduleIdClone,
                    moduleId2: lastModule,
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