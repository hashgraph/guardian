import { ModulesPage } from "../../pages/modulesPage";
const modulesPage = new ModulesPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Workflow Module Deletion", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleNameFileImported = "ComparedModuleFile";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        modulesPage.openModulesTab();
    })

    it("module deletion", () => {
        modulesPage.deleteModule(moduleNameFileImported);
    });
});
