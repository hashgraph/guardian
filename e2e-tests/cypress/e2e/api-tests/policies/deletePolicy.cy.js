import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Policies", { tags: ['policies', 'secondPool'] }, () => {
    const authorization = Cypress.env("authorization");
    let policyId;

    before(() => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: "1707125414.999819805" }, //iRec2
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            policyId = response.body.at(-1).id;
        });
    });

    it("Deletes the policy with the provided ID by user - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: "Registrant",
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = response.body.accessToken
                cy.request({
                    url: API.ApiServer + API.Policies + API.Async + policyId,
                    method: METHOD.DELETE,
                    headers: {
                        authorization: "Bearer " + accessToken,
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                });
            });
        })
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
        cy.request({
            url: API.ApiServer + API.Policies + API.Async + policyId,
            method: METHOD.DELETE,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.ACCEPTED);
        });
    });
});
