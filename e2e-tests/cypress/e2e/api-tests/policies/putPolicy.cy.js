import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Policies", { tags: ['policies', 'secondPool'] }, () => {
    const authorization = Cypress.env("authorization");
    const policyName = Math.floor(Math.random() * 999) + "PolicyName";
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

    it("Updates policy configuration for the specified policy ID", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Policies + policyId,
            headers: {
                authorization,
            },
            body: {
                id: policyId,
                name: policyName,
                config: {},
            },
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
        });
    });

    it("Updates policy configuration for the specified policy ID by user - Negative", () => {
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
                    method: METHOD.PUT,
                    url: API.ApiServer + API.Policies + policyId,
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

    it("Updates policy configuration for the specified policy ID without auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Policies + policyId,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Updates policy configuration for the specified policy ID with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Policies + policyId,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Updates policy configuration for the specified policy ID with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Policies + policyId,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Updates policy configuration for the specified policy ID with invalid policy id - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Policies + policyId + "abrakadabra",
            headers: {
                authorization,
            },
            body: {
                id: policyId,
                name: policyName,
                config: {},
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.NOT_FOUND);
            expect(response.body.message).eql("Policy does not exist.")
        });
    });

    it("Updates policy configuration for the specified policy ID with invalid policy configuration - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Policies + policyId,
            headers: {
                authorization,
            },
            body: {
                id: policyId,
                name: policyName,
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.ERROR);
            expect(response.body.message).eql("You must pass a non-undefined value to the property config of entity Policy.")
        });
    });
});
