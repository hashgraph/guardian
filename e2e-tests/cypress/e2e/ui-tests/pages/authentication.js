import URL from "../../../support/GuardianUrls";
import API from "../../../support/ApiUrls";
import {METHOD} from "../../../support/api/api-const";

const AuthPageLocators = {
    usernameInput: '[formcontrolname="login"]',
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    logoutBtn: "Log out",
    generateBtn: "Generate",
    createNewBtn: "*[class^='create-link']",
    roleName: "*[class^='role-name']",
    role: '[role="combobox"]',
    hederaIdInput: '[formcontrolname="hederaAccountId"]',
    hederaKeyInput: '[formcontrolname="hederaAccountKey"]',
    nextButton: ' Next ',
    geographyInput: '[ng-reflect-name="geography"]',
    lawInput: '[ng-reflect-name="law"]',
    tagsInput: '[ng-reflect-name="tags"]',
    connectButton: 'Connect',
    userWaiting: '/api/v1/profiles/',
};

export class AuthenticationPage {

    visit() {
        cy.visit(URL.Root);
    }

    login(username) {
        const inputName = cy.get(AuthPageLocators.usernameInput);
        inputName.type(username);
        const inputPass = cy.get(AuthPageLocators.passInput);
        inputPass.type("test");
        cy.get(AuthPageLocators.submitBtn).click();
    }

    logOut(username) {
        cy.contains(username).click({force: true});
        cy.contains(AuthPageLocators.logoutBtn).click({force: true});
    }

    checkSetup(role) {
        cy.wait(2000);
        cy.get("body").then((body) => {
            if (body.find(AuthPageLocators.role).length) {
                cy.get(AuthPageLocators.role)
                    .click()
                    .then(() => {
                        cy.get('[role="option"]').contains('StandardRegistry').click();
                        cy.contains(AuthPageLocators.generateBtn).click();
                        cy.wait(5000);
                    });
                cy.contains("Submit").click();
                cy.intercept("/api/v1/profiles/" + role).as("waitForRegister" + role);
                cy.wait("@waitForRegister" + role, {timeout: 180000}).then(() => {
                    cy.contains("Policies").click({force: true});
                });
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
        cy.request({
            method: METHOD.POST,
            url: (API.ApiServer + 'accounts/login'),
            body: {
                username: 'StandardRegistryForSI',
                password: 'test'
            },
            failOnStatusCode: false,
        }).then((response) => {
            if (response.status !== 200) {
                cy.get(AuthPageLocators.createNewBtn).click();
                cy.contains(AuthPageLocators.roleName, "Standard Registry").click();
                cy.get(AuthPageLocators.usernameInput).clear().type(login);
                cy.contains("*[type^='submit']", "Create").click();
                cy.get(AuthPageLocators.hederaIdInput).type("0.0.10750");
                cy.get(AuthPageLocators.hederaKeyInput).type("aaf0eac4a188e5d7eb3897866d2b33e51ab5d7e7bfc251d736f2037a4b2075e8");
                cy.contains(AuthPageLocators.nextButton).click();
                cy.get(AuthPageLocators.geographyInput).type("a");
                cy.get(AuthPageLocators.lawInput).type("a");
                cy.get(AuthPageLocators.tagsInput).type("a");
                cy.contains(AuthPageLocators.connectButton).click();
                cy.intercept(AuthPageLocators.userWaiting + login).as(
                    "waitForSR"
                );
                cy.wait("@waitForSR", {timeout: 300000})
            } else {
                const inputName = cy.get(AuthPageLocators.usernameInput);
                inputName.type("StandardRegistryForSI");
                const inputPass = cy.get(AuthPageLocators.passInput);
                inputPass.type("test");
                cy.get(AuthPageLocators.submitBtn).click();
            }
        })
    }
}
