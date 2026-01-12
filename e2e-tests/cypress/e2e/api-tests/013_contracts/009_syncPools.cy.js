import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let contractIdR;

    const syncPools = (token, id) => {
        return cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + id + "/" + API.SyncPools,
            headers: token ? { authorization: token } : {},
            failOnStatusCode: false
        });
    };

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: { authorization },
                qs: { "type": "RETIRE" },
                timeout: 180000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                contractIdR = response.body.at(0).id;
            });
        });
    });

    it("Sync retire contract pools", () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            syncPools(token, contractIdR).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        });
    });

    it("Sync retire contract pools without auth token - Negative", () => {
        syncPools(null, contractIdR).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Sync retire contract pools with invalid auth token - Negative", () => {
        syncPools("Bearer wqe", contractIdR).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Sync retire contract pools with empty auth token - Negative", () => {
        syncPools("", contractIdR).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Sync retire contract pools as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((token) => {
            syncPools(token, contractIdR).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

});