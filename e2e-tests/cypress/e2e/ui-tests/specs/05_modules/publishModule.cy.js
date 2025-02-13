import { ModulesPage } from "../../pages/modulesPage";
const modulesPage = new ModulesPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Workflow Modules Publish", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "ComparedModuleIPFS";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        modulesPage.openModulesTab();
    })

    it("module publish", () => {
        modulesPage.publishModule(moduleName);
    });

    it("Verify if it possible to Export published module using message identifier", () => {
        modulesPage.exportModuleAsMessageId(moduleName);
    });

    it("Verify if it possible to Export published module using file", () => {
        modulesPage.checkStatus(moduleName, "Published");
        modulesPage.exportModuleAsFile(moduleName);
    });
});
