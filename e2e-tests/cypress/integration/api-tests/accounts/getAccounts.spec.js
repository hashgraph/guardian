/// <reference types="cypress" />

context('Accounts', () => {
    const authorization = Cypress.env('authorization');

    // TODO:
    // Negative scenario to get accounts as non RootAuthority
    it('get all users as a RootAuthority', () => {
        const options = {
          method: 'GET',
          url: Cypress.env('api_server') + 'accounts/',
          headers: {
            authorization,
          }};
    
        cy.request(options)
          .should((response) => {
            expect(response.status).to.eq(200)
            expect(response.body[0]).to.have.property('username')
          })
      })

})