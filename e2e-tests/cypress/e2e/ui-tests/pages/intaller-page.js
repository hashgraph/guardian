import URL from "../../../support/GuardianUrls";

const InstallerPageLocators = {

  usernameInput: '[formcontrolname="login"]',
  passInput: '[formcontrolname="password"]',
  submitBtn: '[type="submit"]',
  logoutBtn: "Log out",
  generateBtn: "Generate",
};

export class InstallerPage {

    fillInfoInstaller() {
        cy.contains('Policies').click({ force: true })
          
        
            cy.get('td').first().parent().get('td').eq('4').click()
            cy.get('[role="combobox"]').click({force: true} )
            cy.wait(6000)
            cy.contains('[role="option"]', 'INSTALLER').click()
             
               cy.get('[type="submit"]').click()
               cy.contains('Applicant legal name').next().type('Agent Smith')
               cy.get('[type="submit"]').click()

               //associate the user (Installer) with the provided Hedera token
               cy.contains('Profile').click()
               cy.contains('TOKENS', { timeout: 180000 }).click().then(() => {
                cy.get('td').first().then((policyName) => {
                  
                     cy.get('td').eq('0').find('dragonglass>a').invoke('text').as('tokenId')
                     cy.get('td').eq('1').within(() => {
                       cy.get('@tokenId').then((tokenId) => {
                         cy.intercept('/api/v1/tokens/' + tokenId + '/associate').as('waitForAccociate')
                         cy.get('div').eq('1').click()
                       
                     })
                   }).then(() => {

                     cy.wait('@waitForAccociate', { timeout: 180000 }).then(() => {
                       cy.contains(Cypress.env('installer_user')).click().then(() => {
                         cy.contains('Log out').click({ force: true })
                       })
                     })
                   })
                 })
               })
             
           
      }


  }
  