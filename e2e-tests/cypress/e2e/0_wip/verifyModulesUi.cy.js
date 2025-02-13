import { ModulesPage } from "../ui-tests/pages/modulesPage";
const modulesPage = new ModulesPage();

import { HomePage } from "../ui-tests/pages/homePage";
const homePage = new HomePage();

context("Verify Modules UI", { tags: ['@ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "q";
    //const moduleName = "UIModule";
    const moduleNameIPFSImported = "ComparedModuleIPFS";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        modulesPage.openModulesTab();
    })

    it("verify ui", () => {
        modulesPage.verifyButtonsAndHeaders();
        modulesPage.verifyDraftModuleDataAndActions(moduleName);
        modulesPage.verifyPublishedModuleDataAndActions(moduleNameIPFSImported);
    });
});
