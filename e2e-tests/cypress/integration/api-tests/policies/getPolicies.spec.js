/// <reference types="cypress" />

context('Policies', () => {
  const authorization = Cypress.env('authorization');

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
        expect(response.status).to.eq(200)
        expect(response.body).to.not.be.oneOf([null, ""])
        expect(response.body[0].id).to.equal(policyId)
        cy.writeFile('cypress/fixtures/policy.json', { policyId: policyId })
      })
  })
})
