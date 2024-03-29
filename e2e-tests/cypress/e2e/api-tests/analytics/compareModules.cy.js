import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Analytics",  { tags: '@analytics' },() => {
    const authorization = Cypress.env("authorization");
    before(() => {
        cy.fixture("displayDocuments.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
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
                });
            });
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage,
            headers: {
                authorization,
            },
            body: {
                "messageId": Cypress.env('module_for_import')
            },
            timeout: 180000
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
        });
    })

    it("Compare modules", () => {
        let moduleId1, moduleId2
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules,
            headers: {
                authorization,
            }
        }).then((response) => {
            moduleId1 = response.body.at(1)._id
            moduleId2 = response.body.at(0)._id
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ModuleCompare,
                body: {
                    moduleId1: moduleId1,
                    moduleId2: moduleId2,
                    eventsLvl: "1",
                    propLvl: "2",
                    childrenLvl: "2",
                    idLvl: "0"
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
                eventsLvl: "1",
                propLvl: "2",
                childrenLvl: "2",
                idLvl: "0"
            },
            headers: {
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare modules with empty auth - Negative", () => {
        const auth = ""
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleCompare,
            body: {
                moduleId1: "6419853a31fe4fd0e741b3a9",
                moduleId2: "641983a931fe4fd0e741b399",
                eventsLvl: "1",
                propLvl: "2",
                childrenLvl: "2",
                idLvl: "0"
            },
            headers: {
                authorization: auth,
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare modules with invalid auth - Negative", () => {
        const auth = "Bearer wqe"
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleCompare,
            body: {
                moduleId1: "6419853a31fe4fd0e741b3a9",
                moduleId2: "641983a931fe4fd0e741b399",
                eventsLvl: "1",
                propLvl: "2",
                childrenLvl: "2",
                idLvl: "0"
            },
            headers: {
                authorization: auth,
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare modules(Export)", () => {
        let moduleId1, moduleId2
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules,
            headers: {
                authorization,
            }
        }).then((response) => {
            moduleId1 = response.body.at(1)._id
            moduleId2 = response.body.at(0)._id
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ModuleCompare + API.ExportCSV,
                body: {
                    moduleId1: moduleId1,
                    moduleId2: moduleId2,
                    eventsLvl: "1",
                    propLvl: "2",
                    childrenLvl: "2",
                    idLvl: "0"
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
                eventsLvl: "1",
                propLvl: "2",
                childrenLvl: "2",
                idLvl: "0"
            },
            headers: {
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare modules(Export) with empty auth - Negative", () => {
        const auth = ""
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleCompare + API.ExportCSV,
            body: {
                moduleId1: "6419853a31fe4fd0e741b3a9",
                moduleId2: "641983a931fe4fd0e741b399",
                eventsLvl: "1",
                propLvl: "2",
                childrenLvl: "2",
                idLvl: "0"
            },
            headers: {
                authorization: auth,
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Compare modules(Export) with invalid auth - Negative", () => {
        const auth = "Bearer wqe"
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ModuleCompare + API.ExportCSV,
            body: {
                moduleId1: "6419853a31fe4fd0e741b3a9",
                moduleId2: "641983a931fe4fd0e741b399",
                eventsLvl: "1",
                propLvl: "2",
                childrenLvl: "2",
                idLvl: "0"
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
