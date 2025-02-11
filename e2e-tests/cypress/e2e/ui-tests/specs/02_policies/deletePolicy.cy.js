import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

context("Workflow Policy Deletion", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        policiesPage.openPoliciesTab();
    })

    it("Verify if it impossible to delete dry run policy", () => {
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.startDryRun(name);
        policiesPage.verifyThatDeleteButtonIsNotActive(name);
        policiesPage.stopDryRun(name);
    });

    it("Verify if it possible to delete draft policy", () => {
        policiesPage.deletePolicy(name);
    });
});
