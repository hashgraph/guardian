import URL from "../../../support/GuardianUrls";

const HomePageLocators = {

  usernameInput: '[formcontrolname="username"]',
  passInput: '[formcontrolname="password"]',
  confirmpassinput : '[formcontrolname="confirmPassword"]',
  submitBtn: '[type="submit"]',
    requestAccessBtn: 'button[label="Request Access"]',
    dialog: 'div[role="dialog"]',
  logoutBtn: "Log out",
  generateBtn: "Generate",
  createLnk: "Sign Up",
    acceptBtn: 'button[label="Accept"]',
    continueBtn: 'button[label="Continue"]',
    SRtype: "Standard Registry",
    userType: 'Default User',
  standardregistryBtn : "Standard Registry",
  userBtn : "User",
  auditorBtn : "Auditor",
  auditEle : ' Audit ',
  trustChainEle : ' Trust Chain ',
  alert: '[role="alert"]'
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


    createStandartRegistryAccount(username) {
        cy.contains(HomePageLocators.createLnk).click();
        cy.get(HomePageLocators.acceptBtn).click();
        cy.contains(HomePageLocators.SRtype).click();
        cy.get(HomePageLocators.continueBtn).click();
        const inputName = cy.get(HomePageLocators.dialog).find(HomePageLocators.usernameInput);
        inputName.click().clear();
        inputName.type(username);
        const inputPass = cy.get(HomePageLocators.dialog).find(HomePageLocators.passInput);
        inputPass.click().clear();
        inputPass.type('test123');
        const confirminputPass = cy.get(HomePageLocators.dialog).find(HomePageLocators.confirmpassinput);
        confirminputPass.click().clear();
        confirminputPass.type('test123');
        cy.get(HomePageLocators.dialog).find(HomePageLocators.requestAccessBtn).click();
    }

  verifyAlert()
  {
    cy.get(HomePageLocators.alert).children().should('contain', 'An account with the same name already exists.');
  }


  createAuditor(username) {
      cy.contains(HomePageLocators.createLnk).click();
      cy.contains(HomePageLocators.auditorBtn).click();
      const inputName = cy.get(HomePageLocators.usernameInput);
      inputName.click().clear();
      inputName.type(username);
      const inputPass = cy.get(HomePageLocators.passInput);
      inputPass.click().clear();
      inputPass.type('test123');
      const confirminputPass = cy.get(HomePageLocators.confirmpassinput);
      confirminputPass.click().clear();
      confirminputPass.type('test123');
      cy.get(HomePageLocators.submitBtn).click();
      cy.wait(2000)
      cy.contains(HomePageLocators.auditEle).should('not.be.null');
      cy.contains(HomePageLocators.trustChainEle).should('not.be.null');
  }

  createUserAccount(username) {
        cy.contains(HomePageLocators.createLnk).click();
      cy.get(HomePageLocators.acceptBtn).click();
      cy.contains(HomePageLocators.userType).click();
      cy.get(HomePageLocators.continueBtn).click();
      const inputName = cy.get(HomePageLocators.dialog).find(HomePageLocators.usernameInput);
      inputName.click().clear();
      inputName.type(username);
      const inputPass = cy.get(HomePageLocators.dialog).find(HomePageLocators.passInput);
      inputPass.click().clear();
      inputPass.type('test123');
      const confirminputPass = cy.get(HomePageLocators.dialog).find(HomePageLocators.confirmpassinput);
      confirminputPass.click().clear();
      confirminputPass.type('test123');
      cy.get(HomePageLocators.dialog).find(HomePageLocators.requestAccessBtn).click();
  }

//Non Happy Scenarios

clickStandardRegistry(){
  cy.contains(HomePageLocators.createLnk).click();
cy.contains(HomePageLocators.standardregistryBtn).click();
}

clickUser(){
  cy.contains(HomePageLocators.createLnk).click();
cy.contains(HomePageLocators.userBtn).click();
}

clickAuditor(){
  cy.contains(HomePageLocators.createLnk).click();
cy.contains(HomePageLocators.auditorBtn).click();
}

checkCreateDisabledUserNameEmpty() {

const inputName = cy.get(HomePageLocators.usernameInput);
inputName.click().clear();
cy.get(HomePageLocators.submitBtn).click({force: true});
cy.get(HomePageLocators.usernameInput).parent().children('span.field-error').should('contain', ' Value is required ');
cy.get(HomePageLocators.submitBtn).should('be.disabled');

}

checkCreateDisabledPasswordEmpty() {
 
const inputName = cy.get(HomePageLocators.passInput);
inputName.click().clear();
cy.get(HomePageLocators.submitBtn).click({force: true});
cy.get(HomePageLocators.passInput).parent().children('span.field-error').should('contain', ' Value is required ');
cy.get(HomePageLocators.confirmpassinput).parent().children('span.field-error').should('contain', 'The entered passwords do not match');
cy.get(HomePageLocators.submitBtn).should('be.disabled');

}

checkCreateDisabledConfirmPasswordEmpty() {

const inputName = cy.get(HomePageLocators.confirmpassinput);
inputName.click().clear();
cy.get(HomePageLocators.confirmpassinput).parent().children('span.field-error').should('contain', 'The entered passwords do not match');
cy.get(HomePageLocators.submitBtn).click({force: true});
cy.get(HomePageLocators.confirmpassinput).parent().children('span.field-error').should('contain', ' Value is required ');
cy.get(HomePageLocators.submitBtn).should('be.disabled');

}

checkCreateDisabledPasswordMismatch() {

const inputpwd = cy.get(HomePageLocators.passInput);
inputpwd.click().clear();
inputpwd.type('Welcome123')
const inputconfirmpwd = cy.get(HomePageLocators.confirmpassinput);
inputconfirmpwd.click().clear();
inputconfirmpwd.type('Welcome12345')
cy.get(HomePageLocators.submitBtn).should('be.disabled');
cy.get(HomePageLocators.submitBtn).click({force: true});
cy.get(HomePageLocators.confirmpassinput).parent().children('span.field-error').should('contain', 'The entered passwords do not match');


}
 

  }
