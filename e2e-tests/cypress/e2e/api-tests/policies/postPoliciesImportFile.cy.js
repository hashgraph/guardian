import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Policies', { tags: '@policies' }, () => {
    const authorization = Cypress.env('authorization');

    it('check returns of all policies', () => {
        cy.request({
            method: "POST",
            url: API.ApiServer + API.PolicisImportMsg,
            body: {messageId: (Cypress.env('policy_with_artifacts'))}, //Remote Work GHG Policy
            headers: {
                authorization,
            },
            timeout: 300000
        })
            .then((response) => {
                let firstPolicyId = response.body.at(-1).id
                let firstPolicyStatus = response.body.at(-1).status
                cy.log(firstPolicyId)
                expect(firstPolicyStatus).to.equal('DRAFT')
                cy.request({
                    method: 'PUT',
                    url: API.ApiServer + 'policies/' + firstPolicyId + '/publish',
                    body: {policyVersion: "1.2.5"},
                    headers: {authorization},
                    timeout: 600000
                })
                    .then((response) => {
                        cy.log(response.body)
                        let secondPolicyId = response.body.policies.at(-1).id
                        let policyStatus = response.body.policies.at(-1).status
                        expect(response.status).to.eq(200)
                        expect(response.body).to.not.be.oneOf([null, ""])
                        expect(firstPolicyId).to.equal(secondPolicyId)
                        expect(policyStatus).to.equal('PUBLISH')
                    })
            })
    })
})
