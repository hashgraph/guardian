import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Analytics", { tags: ['analytics', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    let policyId1, policyId2, preprelastPolicy, prelastPolicy;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK)
                policyId1 = response.body.at(0).id;
                policyId2 = response.body.at(1).id;
            })
        })
    })

    it("Compare policies", { tags: ['smoke'] }, () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicyCompare,
                body: {
                    policyId1: policyId1,
                    policyId2: policyId2,
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
                expect(response.body.left.id).to.eq(policyId1);
                expect(response.body.right.id).to.eq(policyId2);
                expect(response.body.total).not.null;
            })
        })
    });

    it("Compare equal policies", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK)
                response.body.forEach(element => {
                    if (element.name.startsWith("iRec_2_"))
                        preprelastPolicy = element.id;
                    if (element.name == "iRec_2")
                        prelastPolicy = element.id;
                });
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicyCompare,
                    body: {
                        policyId1: preprelastPolicy,
                        policyId2: prelastPolicy,
                        eventsLvl: 2,
                        propLvl: 2,
                        childrenLvl: 2,
                        idLvl: 0
                    },
                    headers: {
                        authorization,
                    }
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                    expect(response.body.left.id).to.eq(preprelastPolicy);
                    expect(response.body.right.id).to.eq(prelastPolicy);
                    expect(response.body.blocks.report.at(0).type).eq("FULL");
                    expect(response.body.total).eq(100);
                })
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

    it("Compare policies with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyCompare,
            body: {
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
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

    it("Compare policies with invalid auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyCompare,
            body: {
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
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

    it("Compare policies(Export)", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicyCompare + API.ExportCSV,
                body: {
                    policyId1: policyId1,
                    policyId2: policyId2,
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

    it("Compare policies(Export) without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyCompare + API.ExportCSV,
            body: {
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
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

    it("Compare policies(Export) with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyCompare + API.ExportCSV,
            body: {
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
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

    it("Compare policies(Export) with invalid auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyCompare + API.ExportCSV,
            body: {
                policyId1: "6419853a31fe4fd0e741b3a9",
                policyId2: "641983a931fe4fd0e741b399",
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
