/// <reference types="cypress" />

context('Policies', () => {
  const authorization = Cypress.env('authorization');

  before(() => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('api_server')}policies/import/message`,
      body: {messageId: (Cypress.env('irec_policy'))},
      headers: {
        authorization,
      }
    })
  })

  // after(() => {
  //   cy.request({
  //     method: 'PUT',
  //     url: Cypress.env('api_server') + 'policies/' + policyId + '/publish',
  //     body: { policyVersion: "1.2.3"},
  //     headers: authorization
  //   })
  //     .should((response) => {
  //       expect(response.status).to.eq(200)
  //       expect(response.body).to.not.be.oneOf([null, ""])
  //       expect(response.body.id).to.equal(policyId)
  //     })
  // })

  it('check returns of all policies', () => {
    const urlPolicies = {
      method: 'GET',
      url: Cypress.env('api_server') + 'policies',
      headers: {
        authorization,
      }
    };
    
    cy.request(urlPolicies)
      .should((response) => {
        let policyId = response.body[0].id
        let policyUuid = response.body[0].uuid
        expect(response.status).to.eq(200)
        expect(response.body).to.not.be.oneOf([null, ""])
        expect(response.body[0].id).to.equal(policyId)
        expect(response.body[0].uuid).to.equal(policyUuid)
        cy.writeFile('cypress/fixtures/policy.json', { policyId: policyId, policyUuid: policyUuid })
      })
  })
})
