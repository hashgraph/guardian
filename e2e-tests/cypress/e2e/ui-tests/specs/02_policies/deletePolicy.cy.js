import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { PoliciesPage } from "../../pages/policies";
const policies = new PoliciesPage();

context("Workflow Policy Deletion", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        policies.openPoliciesTab();
    })

    it("Verify if it impossible to delete dry run policy", () => {
        policies.createPolicyButton();
        policies.fillNewPolicyForm(name);
        policies.backToPoliciesList();
        policies.checkStatus(name, "Draft");
        policies.startDryRun(name);
        policies.checkButtonIsNotActive(name);
        policies.stopDryRun(name);
    });

    it("Verify if it possible to delete draft policy", () => {
        policies.deletePolicy(name);
    });
});
