/// <reference types="cypress" />

context('Accounts', () => {

      it('register a new user and login with it', () => {
          const name = (Math.floor(Math.random() * 999) + 'test001')
        cy.request('POST', (Cypress.env('api_server') + 'accounts/register'), {
            username: name,
            password: 'test'
        }).should((response) => {
            expect(response.status).to.eq(201)
            expect(response.body).to.have.property('username', name)
            expect(response.body).to.have.property('did', null)
            expect(response.body).to.have.property('role', 'USER')
            expect(response.body).to.have.property('id')
        }).then(()=>{
            cy.request('POST', (Cypress.env('api_server') + 'accounts/login'), {
                username: name,
                password: 'test'
            }).should((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.have.property('username', name)
                expect(response.body).to.have.property('role', 'USER')
            })
        })
    })
})