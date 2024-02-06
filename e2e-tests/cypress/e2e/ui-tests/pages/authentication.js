import URL from "../../../support/GuardianUrls";
import { METHOD} from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

const AuthPageLocators = {
    usernameInput: '[formcontrolname="login"]',
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    logoutBtn: '[mattooltip="Logout"]',
    did: 'did:hedera:testnet',
    nextBtn: " Next ",
    generateBtn: "Generate",
    geographyInput: '[ng-reflect-name="geography"]',
    lawInput: '[ng-reflect-name="law"]',
    standardregistryList: 'api/v1/schemas/system/entity/STANDARD_REGISTRY',
    connectBtn: "Connect",
    tagsInput: '[ng-reflect-name="tags"]',
    isicInput: '[ng-reflect-name="ISIC"]',
    createNewBtn: "*[class^='create-link']",
    roleName: "*[class^='role-name']",
    role: '[role="combobox"]',
    title :  'h1.user-onboarding-wizard__title',
    card : '.standard-registry__card',
    taskReq: '/api/v1/tasks/**',
};

export class AuthenticationPage {
    visit() {
        cy.visit(URL.Root);
    }

    static waitForTask(){
        cy.intercept(AuthPageLocators.taskReq).as(
          "waitForTastToComplete"
      );
      cy.wait("@waitForTastToComplete", { timeout: 100000 })
      }
      

    login(username) {
        cy.reload()
        const inputName = cy.get(AuthPageLocators.usernameInput);
        inputName.type(username);
        const inputPass = cy.get(AuthPageLocators.passInput);
        inputPass.type("test");
        cy.get(AuthPageLocators.submitBtn).click();
    }

    logOut(username) {
        cy.get(AuthPageLocators.logoutBtn).click({ force: true });
    }

    checkSetup(role) {
        cy.wait(2000);
       

        cy.get("body").then((body) => {
            if (body.find(AuthPageLocators.card).length) {
                cy.log("Requires registration")
           
                cy.contains('StandardRegistry').click();
                cy.contains('Next').click();
                cy.contains(AuthPageLocators.generateBtn).click();
                AuthenticationPage.waitForTask();
                cy.contains("Submit").click();
                cy.intercept("/api/v1/profiles/" + role).as("waitForRegister" + role);
                cy.wait("@waitForRegister" + role, { timeout: 180000 }).then(() => {
                    cy.contains("Policies").click({ force: true });
                });
            }
         else {
                     cy.log("Role already set")
                }
        });
    }

    createNew(role) {
        cy.get(AuthPageLocators.createNewBtn).click();
        cy.contains(AuthPageLocators.roleName, role).click();
        cy.wait(8000);
        cy.contains("*[type^='submit']", "Create").click();
        cy.get("body").then((body) => {
            cy.get('[role="combobox"]')
                .click()
                .then(() => {
                    cy.get('[role="option"]').contains('StandardRegistry').click();
                    cy.contains(AuthPageLocators.generateBtn).click();
                    cy.wait(5000);
                });
            cy.contains("Submit").click();
            cy.wait(12000);
        });
    }

    createNewSR(login) {
        cy.get(AuthPageLocators.createNewBtn).click();
        cy.contains(AuthPageLocators.roleName, "Standard Registry").click();
        cy.wait(8000);
        cy.get(AuthPageLocators.usernameInput).clear().type(login);
        cy.contains("*[type^='submit']", "Create").click();
        cy.contains(AuthPageLocators.generateBtn).click();
        AuthenticationPage.waitForTask();
        cy.wait(4000);
        cy.contains(AuthPageLocators.nextBtn).click();
        cy.get(AuthPageLocators.geographyInput).type("test");
        cy.get(AuthPageLocators.lawInput).type("law");
        cy.get(AuthPageLocators.tagsInput).type("tag");
        cy.get(AuthPageLocators.isicInput).type("version1");
        cy.contains(AuthPageLocators.connectBtn).click();
        cy.intercept(AuthPageLocators.standardregistryList).as('waitForSetup')
        cy.wait('@waitForSetup', { timeout: 200000 });
        cy.contains(AuthPageLocators.did).should('not.be.null')
    }

}
