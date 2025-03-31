import { ModulesPage } from "../../pages/modulesPage";
const modulesPage = new ModulesPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Workflow Module Tags", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "UIModule";
    const tagName = "tagTestName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        modulesPage.openModulesTab();
    })

    it("add module tag", () => {
        modulesPage.addTag(moduleName, tagName);
    });

    it("delete module tag", () => {
        modulesPage.deleteTag(moduleName, tagName);
    });
});
