/// <reference types="cypress" />

context('Accounts', () => {

    it('should be able to login as a StandardRegistry', () => {
        cy.request('POST', (Cypress.env('api_server') + 'accounts/login'), {
            username: 'StandardRegistry',
            password: 'test'
        }).should((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('username', 'StandardRegistry')
            expect(response.body).to.have.property('did')
            expect(response.body).to.have.property('role', 'STANDARD_REGISTRY')
            expect(response.body).to.have.property('accessToken')
        })
    })

    it('should be able to login as a Installer', () => {
        cy.request('POST', (Cypress.env('api_server') + 'accounts/login'), {
            username: 'Installer',
            password: 'test'
        }).should((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('username', 'Installer')
            expect(response.body).to.have.property('did')
            expect(response.body).to.have.property('role')
            expect(response.body).to.have.property('accessToken')
        })
    })
})
