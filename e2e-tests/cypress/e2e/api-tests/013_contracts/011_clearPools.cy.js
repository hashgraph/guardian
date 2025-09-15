import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let contractIdR;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                qs: {
                    "type": "RETIRE",
                },
                timeout: 180000
            }).then((response) => {
                contractIdR = response.body.at(0).id;
            })
        })
    })

    it("Clear retire contract pools without auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.PoolContract,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Clear retire contract pools with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.PoolContract,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Clear retire contract pools with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.PoolContract,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Clear retire contract pools", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.PoolContract,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });

            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireContract + API.PoolContract,
                headers: {
                    authorization,
                },  
                qs: {
                    contractId: contractIdR
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql([]);
            })
        })
    })
});
