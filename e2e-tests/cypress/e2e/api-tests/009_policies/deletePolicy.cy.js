import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['policies', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let policyId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                policyId = response.body.at(0).id;
            })
        })
    });

    it("Deletes the policy with the provided ID by user - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                url: API.ApiServer + API.Policies + API.Async + policyId,
                method: METHOD.DELETE,
                headers: {
                    authorization,
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it("Deletes the policy with the provided ID without auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.Policies + API.Async + policyId,
            method: METHOD.DELETE,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Deletes the policy with the provided ID with invalid auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.Policies + API.Async + policyId,
            method: METHOD.DELETE,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Deletes the policy with the provided ID with empty auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.Policies + API.Async + policyId,
            method: METHOD.DELETE,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Deletes the policy with the provided ID", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                url: API.ApiServer + API.Policies + API.Async + policyId,
                method: METHOD.DELETE,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.ACCEPTED);
            });
        })
    });
});
