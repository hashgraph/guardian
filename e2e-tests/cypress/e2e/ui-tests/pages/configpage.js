import URL from "../../../support/GuardianUrls";

const ConfigPageLocators = {


  generateBtn: "Generate",
  nextBtn: " Next ",
  hederaIDInput: '[ng-reflect-name="hederaAccountId"]',
  hederaKeyInput: '[ng-reflect-name="hederaAccountKey"]',
  hederaIDUserInput: '[ng-reflect-name="id"]',
  hederaKeyUserInput: '[ng-reflect-name="key"]',
  usernameInput:'[ng-reflect-name="username"]',
  geographyInput: '[ng-reflect-name="geography"]',
  lawInput: '[ng-reflect-name="law"]',
  tagsInput: '[ng-reflect-name="tags"]',
  isicInput: '[ng-reflect-name="ISIC"]',
  connectBtn: "Connect",
  standardregistryList: 'api/v1/schemas/system/entity/STANDARD_REGISTRY',
  userProfileApi: '/api/v1/profiles/',
  did: 'did:hedera:testnet',
  selectadminLst: '[role="combobox"]',
  submitBtn: 'Submit',
  adminList : '.mat-option-text',
  adminHeader : 'h4.mat-line',
  userHeader : 'div.account-item-name'


}
export class ConfigPage {




  finishsetupSD(Option,ID,KEY) {
    if (Option =='GENERATE'){
    cy.contains(ConfigPageLocators.generateBtn).click();
    cy.get(ConfigPageLocators.hederaIDInput).should('not.be.null')
    cy.get(ConfigPageLocators.hederaKeyInput).should('not.be.null')
    cy
      .get(ConfigPageLocators.hederaIDInput)
      .invoke('val')
      .then(text => {
        const ID = text;
        cy.log(ID);
      });


    cy
      .get(ConfigPageLocators.hederaKeyInput)
      .invoke('val')
      .then(text => {
        const KEY = text;
        cy.log(KEY);
      });
    }
    if (Option =='NOGENERATE')
    {
      cy.get(ConfigPageLocators.hederaIDInput).type(ID);
      cy.get(ConfigPageLocators.hederaKeyInput).type(KEY);
      cy.contains(ConfigPageLocators.nextBtn).should('be.enabled');
    }

    cy.contains(ConfigPageLocators.nextBtn).click();

    cy.get(ConfigPageLocators.geographyInput).type("test");
    cy.get(ConfigPageLocators.lawInput).type("law");
    cy.get(ConfigPageLocators.tagsInput).type("tag");
    cy.get(ConfigPageLocators.isicInput).type("version1");
    cy.contains(ConfigPageLocators.connectBtn).click();
    cy.intercept(ConfigPageLocators.standardregistryList).as('waitForSetup')
    cy.wait('@waitForSetup', { timeout: 200000 });
    cy.contains(ConfigPageLocators.did).should('not.be.null')


  }



 

  finishsetupUser(admin, username,Option,ID,KEY) {

  
       
        cy.get(ConfigPageLocators.usernameInput).type(admin);
        cy.contains('Apply').click();
        cy.get('.standard-registry').find('span').contains(admin).click();
        cy.contains('Next').click();

        if (Option =='GENERATE'){
          cy.contains(ConfigPageLocators.generateBtn).click()
        }
        if (Option =='NOGENERATE')
        {
          cy.get(ConfigPageLocators.hederaIDUserInput).type(ID);
          cy.get(ConfigPageLocators.hederaKeyUserInput).type(KEY);
          cy.contains(ConfigPageLocators.submitBtn).should('be.enabled');
        }
        cy.contains(ConfigPageLocators.submitBtn).click()
        cy.intercept(ConfigPageLocators.userProfileApi + username).as('waitForuser')
        cy.wait('@waitForuser', { timeout: 8000 })
      
    


  }

  verifyHeaderLabelsOnLoginPageForAdmin() {
  
    cy.get(ConfigPageLocators.adminHeader).should(($header) => {
        expect($header.get(0).innerText).to.eq('DID Document')
        expect($header.get(1).innerText).to.eq('VC Document')
        expect($header.get(2).innerText).to.eq('Balance')
        expect($header.get(3).innerText).to.eq('Hedera Account Id')
        expect($header.get(4).innerText).to.eq('DID')
        expect($header.get(5).innerText).to.eq('User Topic')
        expect($header.get(6).innerText).to.eq('Initialization topic')

    })
}

verifyHeaderLabelsOnLoginPageForUser() {
  
  cy.get(ConfigPageLocators.userHeader).should(($header) => {
      expect($header.get(0).innerText).to.eq('HEDERA ID')
      expect($header.get(1).innerText).to.eq('BALANCE')
      expect($header.get(2).innerText).to.eq('USER TOPIC')
      expect($header.get(3).innerText).to.eq('Standard Registry')
      expect($header.get(4).innerText).to.eq('DID')
      expect($header.get(5).innerText).to.eq('DID Document')
   

  })
}


}
