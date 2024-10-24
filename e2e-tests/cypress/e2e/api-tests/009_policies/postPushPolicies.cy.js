import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Policies', { tags: ['policies', 'secondPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const nameTag = "EmptyPolicyTagByAsync";
    const policyName = "EmptyPolicyNameByAsync";

    it('Creates a new policy - async', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + API.Async,
                headers: {
                    authorization
                },
                body: {
                    name: policyName,
                    policyTag: nameTag,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
            })
        })
    })

    it("Creates a new policy without auth token - async - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies + API.Async,
            failOnStatusCode: false,
            body: {
                name: policyName,
                policyTag: nameTag,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Creates a new policy with invalid auth token - async - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies + API.Async,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
            body: {
                name: policyName,
                policyTag: nameTag,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Creates a new policy with empty auth token - async - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies + API.Async,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
            body: {
                name: policyName,
                policyTag: nameTag,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Creates a new policy by user - async - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + API.Async,
                headers: {
                    authorization,
                },
                failOnStatusCode: false,
                body: {
                    name: policyName,
                    policyTag: nameTag,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });
})
