/// <reference types="cypress" />

context('Policy - Import', () => {
    it('imports new policy and all associated artifacts from IPFS into the local DB', () => {
        cy.request('POST', (Cypress.env('api_server') + 'policies/import/message'), {
            "messageId": Cypress.env('irec_policy')
        }).should((response) => {
            expect(response.status).to.eq(201)
        })
    })
})