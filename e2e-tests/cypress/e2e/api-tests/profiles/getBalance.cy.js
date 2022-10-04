
context('Profiles',() => {
    const authorization = Cypress.env('authorization');

    it('it returns user account information', () => {
        const options = {
            method: 'GET',
            url: Cypress.env('api_server') + 'profiles/' + Cypress.env('root_user') + '/balance',
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