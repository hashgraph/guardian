/// <reference types="cypress" />

context('Policies', () => {
    const authorization = Cypress.env('authorization');
    let policiesId = ""
    it('check returns of all policies and the policie', () => {
        const urlPolicies = {
          method: 'GET',
          url: Cypress.env('api_server') + 'policies',
          headers: {
            authorization,
          }};
        // GET policies      
        cy.request(urlPolicies)
          .should((response) => {
            policiesId = response.body[0].id
            expect(response.status).to.eq(200)
            expect(response.body).to.not.be.oneOf([null, ""])
            expect(response.body[0].id).to.equal(policiesId)
          })
          .then(() => {
            const urlPoliciesId = {
              method: 'GET',
              url: Cypress.env('api_server') + 'policies/' + policiesId,
              headers: {
                authorization,
              }};
            // GET policies/{policyId}  
            cy.request(urlPoliciesId)
                .should((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.not.be.oneOf([null, ""])
                expect(response.body.id).to.equal(policiesId)
                })
          })
    })
})
