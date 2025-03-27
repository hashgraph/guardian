import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

context("Edit Policy. Search flow", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
    });

    it("Verify if it possible to search by Components", () => {
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.openEditingPolicy(name);
        policiesPage.fillSearchField("Aggregate Data");
        policiesPage.verifyIfSearchResultContains("Aggregate Data");
    });

    it("Verify if it possible to search by Modules", () => {
        policiesPage.openEditingPolicy(name);
        policiesPage.openModulesInPolicy();
        policiesPage.fillSearchField("testModule");
        policiesPage.verifyIfSearchResultIsEmpty();
    });

    after(() => {
        policiesPage.backToPoliciesList();
        policiesPage.deletePolicy(name);
    });
});
