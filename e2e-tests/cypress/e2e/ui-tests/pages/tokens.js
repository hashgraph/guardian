import ASSERT from "../../../support/CustomHelpers/assertions";
import TIMEOUTS from "../../../support/CustomHelpers/timeouts";
import URL from "../../../support/GuardianUrls";
import {log} from "util";

const TokensPageLocators = {
    importBtn: "Tokens",
    createTokenBtn: " Create Token ",
    publishedBtn: "Published",
    createFinalBtn: "div.g-dialog-actions",
    tokensList: "/api/v1/tokens",
    tokenNameInput: '[data-placeholder = "Token Name"]',
    tokenName: "td.mat-column-tokenName",
    tokenId: "td > hedera-explorer > a"
};

export class TokensPage {
    openTokensTab() {
        cy.visit(URL.Root + URL.Tokens);
    }
    static waitForTokens()
    {
        cy.intercept(TokensPageLocators.tokensList).as(
            "waitForTokensList"
        );
        cy.wait("@waitForTokensList", { timeout: 200000 })
    }
    createToken(name) {
        cy.contains(TokensPageLocators.createTokenBtn).click();
        cy.contains(TokensPageLocators.publishedBtn).click();
        cy.get(TokensPageLocators.tokenNameInput).clear().type(name);
        cy.get(TokensPageLocators.createFinalBtn).click();
        TokensPage.waitForTokens();
        cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);
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
