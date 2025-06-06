import { ModulesPage } from "../../pages/modulesPage";
const modulesPage = new ModulesPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Workflow Module Creation", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "UIModule";
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
        modulesPage.importNewModuleIPFS("1727267276.509160001", moduleNameIPFSImported);
    });

    it("module file import", () => {
        modulesPage.importNewModuleFile('comparedModuleFile.module', moduleNameFileImported);
    });
});
