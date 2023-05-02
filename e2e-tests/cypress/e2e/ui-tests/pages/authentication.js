import URL from "../../../support/GuardianUrls";

const AuthPageLocators = {
    usernameInput: '[formcontrolname="login"]',
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    logoutBtn: "Log out",
    generateBtn: "Generate",
    createNewBtn: "*[class^='create-link']",
    roleName: "*[class^='role-name']",
    role: '[role="combobox"]',
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
        const standartRegistry = cy.contains(username);
        standartRegistry.click({ force: true });
        cy.contains(AuthPageLocators.logoutBtn).click({ force: true });
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
                cy.wait("@waitForRegister" + role, { timeout: 180000 }).then(() => {
                    cy.contains("Policies").click({ force: true });
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
}
