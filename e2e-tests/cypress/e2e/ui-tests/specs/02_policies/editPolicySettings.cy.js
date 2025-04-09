import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

context("Edit Policy. Settings flow", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
    });

    it("Verify if it possible to swith to json mode", () => {
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.openEditingPolicy(name);
        policiesPage.clickOnButtonByText("Settings");
        policiesPage.verifyIfTextExists("Settings");
        policiesPage.verifyIfTextExists("Cancel");
        policiesPage.verifyIfTextExists("Save");
        policiesPage.verifyIfTextExists("Theme");
        policiesPage.verifyIfTextExists("New");
        policiesPage.verifyIfTextExists("Copy");
        policiesPage.verifyIfTextExists("Import");
        policiesPage.verifyIfTextExists("Blocks");
        policiesPage.verifyIfTextExists("Syntax");
        policiesPage.verifyIfTextExists("Condition");
        policiesPage.verifyIfTextExists("Style");
        policiesPage.verifyIfTextExists("Description");
        policiesPage.clickOnButtonByText(" Cancel ");
    });

    after(() => {
        policiesPage.backToPoliciesList();
        policiesPage.deletePolicy(name);
    });
});
