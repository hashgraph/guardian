import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Policies', { tags: '@policies' }, () => {

    const authorization = Cypress.env('authorization');
    const nameTag = Math.floor(Math.random() * 999) + "test666";
    const policyName = Math.floor(Math.random() * 999) + "PolicyName";

    it('Creates a new policy', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies,
            headers: {
                authorization
            },
            body:{
                name: policyName,
                policyTag: nameTag,
            },
            timeout: 180000
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
        })
    })

    it("Creates a new policy without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies,
            failOnStatusCode: false,
            body:{
                name: policyName,
                policyTag: nameTag,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Creates a new policy with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
            body:{
                name: policyName,
                policyTag: nameTag,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Creates a new policy with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Policies,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
            body:{
                name: policyName,
                policyTag: nameTag,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Creates a new policy by user - Negative", () => {
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
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies,
                    headers: {
                        authorization: "Bearer " + accessToken,
                    },
                    failOnStatusCode: false,
                    body:{
                        name: policyName,
                        policyTag: nameTag,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                });
            });
        })
    });
})
