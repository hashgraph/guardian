import ASSERT from "../../../support/CustomHelpers/assertions";
import TIMEOUTS from "../../../support/CustomHelpers/timeouts";
import URL from "../../../support/GuardianUrls";

const TokensPageLocators = {
    importBtn: "Tokens",
};

export class TokensPage {
    openTokensTab() {
        cy.visit(URL.Root + URL.Tokens);
    }

    grantKYC() {
             cy.get('@tokenId').then((tokenId) => {
               cy.contains(tokenId)
                 .parents('tr')
                 .find('td').eq('4')
                 .find('a').click()
           })
           cy.contains('Installer').parent().within(() => {
             cy.get('@tokenId').then((tokenId) => {
               let url = '/api/v1/tokens/' + tokenId + '/Installer/grantKyc'
               cy.intercept('PUT', url).as('waitForGrantKyc').then(() => {
                 cy.get('td').eq('4').click()
                  
               })
             })
           }).then(() => {

             //approve documents from the Installer
             cy.contains('Policies').click()
             cy.get('@policyName').then((policyName) => {
               cy.contains(policyName)
                 .parent()
                 .find('td').eq('10')
                 .find('div').click({ force: true })
                 .then(() => {
                   cy.get('@policyId').then((policyId) => {
                     cy.intercept('/api/v1/policies/' + policyId + '/tag/approve_documents_btn').as('waitForApprove').then(() => {
                       cy.get('.btn-approve').click()
                       cy.wait('@waitForApprove', { timeout: 180000 })
                     })
                   })
                 })
               cy.contains(Cypress.env('root_user')).click().then(() => {
                 cy.contains('Log out').click({ force: true })
               })
             })
           })
    }

   

}
