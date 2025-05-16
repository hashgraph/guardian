import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { SettingsPage } from "../../pages/settings";
const settings = new SettingsPage();

context("Check settings page", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        settings.openSettingsTab();
    })

    it("Verify if all fields have a validation on settings page", () => {
        settings.verifyIfFieldHasValidation();
    });

});
