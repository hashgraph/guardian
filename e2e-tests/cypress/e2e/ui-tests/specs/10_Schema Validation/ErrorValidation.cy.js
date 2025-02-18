import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Error Validation on schema fields", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = "policyForValidation";

    before(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.importPolicyFromIPFS("1739792278.532981000");  //policyForValidation
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.startDryRun(name);
        policiesPage.checkStatus(name, "In Dry Run");
    });

    it("Error Validation on schema fields", () => {
        policiesPage.openPolicy(name);
        policiesPage.validateTypesDefault();
        policiesPage.validateTypesRequired();
        policiesPage.validateTypesMultiplie();
        policiesPage.validateTypesMultiplieRequired();
    });
});