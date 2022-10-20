import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Policy - Import', { tags: '@policies' },() => {
    const authorization = Cypress.env('authorization');
  
    it('push imports new policy and all associated artifacts from IPFS into the local DB', () => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('api_server')}policies/import/message`,
        body: { messageId: (Cypress.env('irec_policy')) },
        headers: {
          authorization,
        },
        timeout: 180000
      })
        .then(response => {
          let firstPolicyId = response.body.at(-1).id
          let firstPolicyStatus = response.body.at(-1).status
          expect(firstPolicyStatus).to.equal('DRAFT')
          cy.request({
            method: 'PUT',
            url: Cypress.env('api_server') + 'policies/push/' + firstPolicyId + '/publish',
            body: { policyVersion: "1.2.5" },
            headers: { authorization },
            timeout: 600000
          })
            .should((response) => {
              expect(response.status).to.eq(201)
            })
        })
    })
  })