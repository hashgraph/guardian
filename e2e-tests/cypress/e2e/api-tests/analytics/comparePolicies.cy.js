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
            .then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportMsg,
                    body: {
                        "messageId": Cypress.env('policy_for_compare2')//iRec 5
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

    it("Compare policies", () => {
        let policyId1, policyId2
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            }
        }).then((response) => {
            policyId1 = response.body.at(1)._id
            policyId2 = response.body.at(0)._id
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicyCompare,
                body: {
                    policyId1: policyId1,
                    policyId2: policyId2,
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
                expect(response.body.left.id).to.eq(policyId1);
                expect(response.body.right.id).to.eq(policyId2);
                expect(response.body.total).not.null;
            })
        })
    });

    it("Compare policies without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyCompare,
            body: {
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
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

    it("Compare policies with empty auth - Negative", () => {
        const auth = ""
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyCompare,
            body: {
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
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

    it("Compare policies with invalid auth - Negative", () => {
        const auth = "Bearer wqe"
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyCompare,
            body: {
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
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

    it("Compare policies(Export)", () => {
        let policyId1, policyId2
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            }
        }).then((response) => {
            policyId1 = response.body.at(1)._id
            policyId2 = response.body.at(0)._id
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicyCompare + API.ExportCSV,
                body: {
                    policyId1: policyId1,
                    policyId2: policyId2,
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

    it("Compare policies(Export) without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyCompare + API.ExportCSV,
            body: {
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
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

    it("Compare policies(Export) with empty auth - Negative", () => {
        const auth = ""
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyCompare + API.ExportCSV,
            body: {
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
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

    it("Compare policies(Export) with invalid auth - Negative", () => {
        const auth = "Bearer wqe"
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyCompare + API.ExportCSV,
            body: {
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
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
