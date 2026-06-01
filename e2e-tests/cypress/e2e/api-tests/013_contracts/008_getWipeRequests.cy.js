import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let contractUuidW;

    const getWipeRequests = (auth, qs = {}) => {
        return cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.WipeRequests,
            headers: auth ? { authorization: auth } : {},
            qs: qs,
            failOnStatusCode: false
        });
    };

    before("Wait request", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: { authorization },
                qs: { "type": "WIPE" },
            }).then((response) => {
                contractUuidW = response.body.at(0).contractId;
                Checks.whileRetireRequestCreating(contractUuidW, authorization, 0);
                getWipeRequests(authorization, { contractId: contractUuidW }).then((res) => {
                    expect(res.status).eql(STATUS_CODE.OK);
                });
            });
        });
    });

    it("Get wipe request", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getWipeRequests(authorization, { contractId: contractUuidW }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(0).contractId).eql(contractUuidW);
            });
        });
    });

    it("Get all wipe contracts requests", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getWipeRequests(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        });
    });

    it("Get all wipe contracts requests without auth token - Negative", () => {
        getWipeRequests(null).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get all wipe contracts requests with invalid auth token - Negative", () => {
        getWipeRequests("Bearer wqe").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get all wipe contracts requests with empty auth token - Negative", () => {
        getWipeRequests("").then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get wipe request without auth token - Negative", () => {
        getWipeRequests(null, { contractId: contractUuidW }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get wipe request with invalid auth token - Negative", () => {
        getWipeRequests("Bearer wqe", { contractId: contractUuidW }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get wipe request with empty auth token - Negative", () => {
        getWipeRequests("", { contractId: contractUuidW }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
    
});