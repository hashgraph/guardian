import { HomePage } from "../../../pages/homePage";
const homePage = new HomePage();

import { PoliciesPage } from "../../../pages/policiesPage";
const policiesPage = new PoliciesPage();

context("Edit Policy. Switch mode flow", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
    });

    it("Verify if it possible to switch to json mode", () => {
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.openEditingPolicy(name);
        policiesPage.clickOnButtonByText("Tree");
        policiesPage.clickOnButtonByText("JSON");
        policiesPage.verifyIfContainerJsonIsDisplayed();
    });

    it("Verify if it possible to switch to tree mode", () => {
        policiesPage.openEditingPolicy(name);
        policiesPage.verifyIfTreeContainerIsDisplayed();
    });

    after(() => {
        policiesPage.backToPoliciesList();
        policiesPage.deletePolicy(name);
    });
});
