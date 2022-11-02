import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";



context('Policy - Import',{ tags: '@policies' }, () => {
  const authorization = Cypress.env('authorization');

  it('imports new policy and all associated artifacts from IPFS into the local DB', () => {
    cy.request({
      method: 'POST',
      url: API.ApiServer + "policies/import/message",
      body: { "messageId":"1650282926.728623821"},
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
          url: API.ApiServer + 'policies/' + firstPolicyId + '/publish',
          body: { policyVersion: "1.2.5" },
          headers: { authorization },
          timeout: 600000
        })
          .should((response) => {
            let secondPolicyId = response.body.policies.at(-1).id
            let policyStatus = response.body.policies.at(-1).status
            expect(response.status).to.eq(200)
            expect(response.body).to.not.be.oneOf([null, ""])
            expect(firstPolicyId).to.equal(secondPolicyId)
            expect(policyStatus).to.equal('PUBLISH')
          })
      })
  })

  it('should attempt to import the invalid policy', () => {
    cy.request({
      method: 'POST',
      url: API.ApiServer + "policies/import/message",
      body: { "messageId":"0000000000.000000000"},
      headers: {
        authorization,
      },
      failOnStatusCode:false,
      timeout: 180000
    })
      .then(response => {
        expect(response.status).eql(STATUS_CODE.ERROR);
      })
  })
})