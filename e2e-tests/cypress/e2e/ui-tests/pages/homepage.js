import URL from "../../../support/GuardianUrls";

const HomePageLocators = {

  usernameInput: '[formcontrolname="login"]',
  passInput: '[formcontrolname="password"]',
  submitBtn: '[type="submit"]',
  logoutBtn: "Log out",
  generateBtn: "Generate",
};

export class HomePage {
    visit() {
      cy.visit(URL.Root);
    }
  
    loginAsStandartRegistry() {
        const inputName = cy.get(HomePageLocators.usernameInput);
        inputName.type('StandardRegistry');
        const inputPass = cy.get(HomePageLocators.passInput);
        inputPass.type('test');
        cy.get(HomePageLocators.submitBtn).click();
    }


    logoutAsStandartRegistry() {
        const standartRegistry = cy.contains('StandardRegistry');
        standartRegistry.click({ force: true });
        cy.contains(HomePageLocators.logoutBtn).click({ force: true });
    }

    loginAsInstaller() {
        const inputName = cy.get(HomePageLocators.usernameInput);
        inputName.type('Installer');
        const inputPass = cy.get(HomePageLocators.passInput);
        inputPass.type('test');
        cy.get(HomePageLocators.submitBtn).click();
    }

    logoutAsInstaller() {
        const Installer = cy.contains('Installer');
        Installer.click({ force: true });
        cy.contains(HomePageLocators.logoutBtn).click({ force: true });
    }


    loginAsRegistrant() {
        const inputName = cy.get(HomePageLocators.usernameInput);
        inputName.type('Registrant');
        const inputPass = cy.get(HomePageLocators.passInput);
        inputPass.type('test');
        cy.get(HomePageLocators.submitBtn).click();
    }

    logoutAsRegistrant() {
        const Installer = cy.contains('Registrant');
        Installer.click({ force: true });
        cy.contains(HomePageLocators.logoutBtn).click({ force: true });
    }

    loginAsVVB() {
        const inputName = cy.get(HomePageLocators.usernameInput);
        inputName.type('VVB');
        const inputPass = cy.get(HomePageLocators.passInput);
        inputPass.type('test');
        cy.get(HomePageLocators.submitBtn).click();
    }

    logoutAsVVB() {
        const standartRegistry = cy.contains('VVB');
        standartRegistry.click({ force: true });
        cy.contains(HomePageLocators.logoutBtn).click({ force: true });
    }

    checkSetupInstaller() {
        cy.wait(2000)
          cy.get('body').then((body) => {
               if (body.find('[role="combobox"]').length) {

                 //fill info for Installer
                 cy.get('[role="combobox"]').click().then(() => {
                   cy.get('[role="option"]').click()
                   cy.contains(HomePageLocators.generateBtn).click()
                       
                   cy.wait(5000)
                     
                   })
                   cy.contains('Submit').click()
                   cy.intercept('/api/v1/profiles/Installer').as('waitForRegisterInstaller')
                   cy.wait('@waitForRegisterInstaller', { timeout: 180000 }).then(() => {
                     cy.contains('Policies').click({ force: true })
                   })
                
               }
             })
    }


    checkSetupRegistrant() {
        cy.wait(2000)
          cy.get('body').then((body) => {
               if (body.find('[role="combobox"]').length) {

                 //fill info for Registrant
                 cy.get('[role="combobox"]').click().then(() => {
                   cy.get('[role="option"]').click()
                   cy.contains(HomePageLocators.generateBtn).click()
                       
                   cy.wait(5000)
                     
                   })
                   cy.contains('Submit').click()
                   cy.intercept('/api/v1/profiles/Installer').as('waitForRegisterRegistrant')
                   cy.wait('@waitForRegisterRegistrant', { timeout: 8000 })
               }
             })
    }

    checkSetupVVB() {
        cy.wait(2000)
          cy.get('body').then((body) => {
               if (body.find('[role="combobox"]').length) {

                 //fill info for Registrant
                 cy.get('[role="combobox"]').click().then(() => {
                   cy.get('[role="option"]').click()
                   cy.contains(HomePageLocators.generateBtn).click()
                       
                   cy.wait(5000)
                     
                   })
                   cy.contains('Submit').click()
                   cy.intercept('/api/v1/profiles/Installer').as('waitForVVB')
                   cy.wait('@waitForVVB', { timeout: 8000 })
               }
             })
    }
  

  }
  