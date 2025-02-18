import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

context("Edit Policy. Favorites flow", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
    });

    it("Verify if it possible to add favorites", () => {
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.openEditingPolicy(name);
        policiesPage.selectToFavorites("Aggregate Data");
        policiesPage.verifyIfSearchResultContains("Favorites (1)");
    });

    it("Verify if it possible to delete favorites", () => {
        policiesPage.openEditingPolicy(name);
        policiesPage.selectToFavorites("Aggregate Data");
        policiesPage.selectToFavorites("Aggregate Data");
        policiesPage.verifyIfSearchResultIsNotContains("Favorites (1)");
    });

    after(() => {
        policiesPage.backToPoliciesList();
        policiesPage.deletePolicy(name);
    });
});
