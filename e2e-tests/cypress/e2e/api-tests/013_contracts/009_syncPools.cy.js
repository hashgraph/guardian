import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

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
                expect(response.status).eql(STATUS_CODE.OK);
                contractIdR = response.body.at(0).id;
            });
        })
    })

    it("Sync retire contract pools", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.SyncPools,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            })
        })
    });

    it("Sync retire contract pools without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.SyncPools,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Sync retire contract pools with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.SyncPools,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Sync retire contract pools with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.SyncPools,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Sync retire contract pools as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.SyncPools,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });
});
