import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Tokens", { tags: ['tokens', 'thirdPool'] }, () => {
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
                cy.request({
                    method: 'PUT',
                    url: API.ApiServer + 'policies/' + policyId + '/publish',
                    body: { policyVersion: "1.2.5" },
                    headers: { authorization },
                    timeout: 600000
                })
            }).then(() => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + 'permissions/users/' + UserUsername + '/policies/assign',
                    headers: { authorization },
                    body: {
                        policyIds: [
                            policyId
                        ],
                        assign: true
                    }
                })
            })
        });
    })


    it("Associate and disassociate the user with the provided Hedera token", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: 'GET',
                url: API.ApiServer + 'tokens',
                headers: {
                    authorization
                }
            }).then((response) => {
                let tokenId = response.body.at(-1).tokenId
                cy.request({
                    method: 'PUT',
                    url: API.ApiServer + 'tokens/' + tokenId + '/associate',
                    headers: {
                        authorization
                    }
                })
                cy.request({
                    method: 'PUT',
                    url: API.ApiServer + 'tokens/' + tokenId + '/dissociate',
                    headers: {
                        authorization
                    }
                })
            })
        })
    })
})
