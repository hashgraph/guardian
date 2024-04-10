import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Analytics",  { tags: '@analytics' },() => {
    const authorization = Cypress.env("authorization");
    before(() => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsg,
            body: {
                "messageId": Cypress.env('policy_for_compare1')//iRec 4
            },
            headers: {
                authorization,
            },
            timeout: 180000
        })
    })

    it("Compare schemas", () => {
        let schemaId1, schemaId2
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicySchemas,
            headers: {
                authorization,
            }
        }).then((response) => {
            schemaId1 = response.body.at(1)._id
            schemaId2 = response.body.at(0)._id
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.SchemaCompare,
                body: {
                    schemaId1: schemaId1,
                    schemaId2: schemaId2,
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
                expect(response.body.left.id).to.eq(schemaId1);
                expect(response.body.right.id).to.eq(schemaId2);
                expect(response.body.total).not.null;
            })
        })
    });


    it("Compare schemas without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.SchemaCompare,
            body: {
                schemaId1: "6419853a31fe4fd0e741b3a9",
                schemaId2: "641983a931fe4fd0e741b399",
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

    it("Compare schemas with empty auth - Negative", () => {
        const auth = ""
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.SchemaCompare,
            body: {
                schemaId1: "6419853a31fe4fd0e741b3a9",
                schemaId2: "641983a931fe4fd0e741b399",
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

    it("Compare schemas with invalid auth - Negative", () => {
        const auth = "Bearer wqe"
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.SchemaCompare,
            body: {
                schemaId1: "6419853a31fe4fd0e741b3a9",
                schemaId2: "641983a931fe4fd0e741b399",
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

    it("Compare schemas(Export)", () => {
        let schemaId1, schemaId2
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicySchemas,
            headers: {
                authorization,
            }
        }).then((response) => {
            schemaId1 = response.body.at(1)._id
            schemaId2 = response.body.at(0)._id
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.SchemaCompare + API.ExportCSV,
                body: {
                    schemaId1: schemaId1,
                    schemaId2: schemaId2,
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


    it("Compare schemas(Export) without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.SchemaCompare + API.ExportCSV,
            body: {
                schemaId1: "6419853a31fe4fd0e741b3a9",
                schemaId2: "641983a931fe4fd0e741b399",
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

    it("Compare schemas(Export) with empty auth - Negative", () => {
        const auth = ""
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.SchemaCompare + API.ExportCSV,
            body: {
                schemaId1: "6419853a31fe4fd0e741b3a9",
                schemaId2: "641983a931fe4fd0e741b399",
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

    it("Compare schemas(Export) with invalid auth - Negative", () => {
        const auth = "Bearer wqe"
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.SchemaCompare + API.ExportCSV,
            body: {
                schemaId1: "6419853a31fe4fd0e741b3a9",
                schemaId2: "641983a931fe4fd0e741b399",
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
