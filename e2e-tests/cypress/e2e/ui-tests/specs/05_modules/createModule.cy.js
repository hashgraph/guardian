import { ModulesPage } from "../../pages/modulesPage";
const modulesPage = new ModulesPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Workflow Module Creation", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "UIModule";
    const moduleMessageId = Cypress.env('module_for_import');
    const moduleNameIPFSImported = "ComparedModuleIPFS";
    const moduleNameFileImported = "ComparedModuleFile";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        modulesPage.openModulesTab();
    })


    it("module creation", () => {
        modulesPage.createNewModule(moduleName);
    });

    it("module ipfs import", () => {
        modulesPage.importNewModuleIPFS(moduleMessageId, moduleNameIPFSImported);
    });

    it("module file import", () => {
        modulesPage.importNewModuleFile('comparedModuleFile.module', moduleNameFileImported);
    });
});
