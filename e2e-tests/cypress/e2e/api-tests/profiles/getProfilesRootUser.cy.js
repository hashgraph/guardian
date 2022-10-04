
context('Profiles',() => {
    const authorization = Cypress.env('authorization');

    it('it returns user account information', () => {
        const options = {
            method: 'GET',
            url: Cypress.env('api_server') + 'profiles/' + Cypress.env('root_user'),
            headers: {
              authorization,
            }};
        cy.request(options)
          .should((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('confirmed')
            expect(response.body).to.have.property('failed')
            expect(response.body).to.have.property('username', Cypress.env('root_user'))
            expect(response.body).to.have.property('role', 'STANDARD_REGISTRY')
            expect(response.body).to.have.property('hederaAccountId')
            expect(response.body).to.have.property('did')
            expect(response.body).to.have.property('didDocument')
            expect(response.body).to.have.property('vcDocument')
        })
    })
})