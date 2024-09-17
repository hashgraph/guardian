import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context('Policies', { tags: ['policies', 'secondPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Push publish the policy with the specified (internal) policy ID', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: 'POST',
                url: API.ApiServer + 'policies/import/message',
                body: { messageId: (Cypress.env('irec_policy')) },
                headers: {
                    authorization,
                },
                timeout: 180000
            })
                .then(response => {
                    let firstPolicyId = response.body.at(0).id
                    let firstPolicyStatus = response.body.at(0).status
                    expect(firstPolicyStatus).to.equal('DRAFT')
                    cy.request({
                        method: 'PUT',
                        url: API.ApiServer + 'policies/push/' + firstPolicyId + '/publish',
                        body: { policyVersion: "1.2.5" },
                        headers: { authorization },
                        timeout: 600000
                    })
                        .then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
                        })
                })
        })
    })
})
