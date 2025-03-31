import { ModulesPage } from "../../pages/modulesPage";
const modulesPage = new ModulesPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Workflow Module Export", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "UIModule";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        modulesPage.openModulesTab();
    })

    it("Verify if it impossible to Export draft module using message identifier", () => {
        modulesPage.checkStatus(moduleName, "Draft");
        modulesPage.openExportModal(moduleName);
        modulesPage.verifyThatButtonDisabled("Copy message identifier");
    });

    it("Verify if it possible to Export draft module using file", () => {
        modulesPage.checkStatus(moduleName, "Draft");
        modulesPage.exportModuleAsFile(moduleName);
    });
});
