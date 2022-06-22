/// <reference types="cypress" />

context('Accounts', () => {

    it('should be able to login as a RootAuthority', () => {
        cy.request('POST', (Cypress.env('api_server') + 'accounts/login'), {
            username: 'RootAuthority',
            password: 'test'
        }).should((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('username', 'RootAuthority')
            expect(response.body).to.have.property('did')
            expect(response.body).to.have.property('role', 'ROOT_AUTHORITY')
            expect(response.body).to.have.property('accessToken')
        })
    })
})
