/// <reference types="cypress" />

context('Accounts', () => {
    const authorization = Cypress.env('authorization');

    it('get all users with root-authorities role', () => {
        const options = {
            method: 'GET',
            url: Cypress.env('api_server') + 'accounts/root-authorities',
            headers: {
              authorization,
            }};
      
        cy.request(options)
        .should((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.not.be.oneOf([null, ""])
        })
    })
})