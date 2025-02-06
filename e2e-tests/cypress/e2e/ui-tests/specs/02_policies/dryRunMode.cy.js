import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { PoliciesPage } from "../../pages/policies";
const policies = new PoliciesPage();

context("Dry run Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        policies.openPoliciesTab();
    })

    //TBD: Full policy flow with tokens minting
    it("checks dry run workflow", () => {
        policies.createPolicyButton();
        policies.fillNewPolicyForm(name);
        policies.backToPoliciesList();
        policies.checkStatus(name, "Draft");
        policies.startDryRun(name);
        policies.stopDryRun(name);
    });
});
