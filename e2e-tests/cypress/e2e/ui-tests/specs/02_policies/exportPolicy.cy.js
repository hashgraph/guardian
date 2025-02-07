import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { PoliciesPage } from "../../pages/policies";
const policies = new PoliciesPage();

context("Export Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        policies.openPoliciesTab();
    })
    
    it("Verify if it possible to Export draft policy using file", () => {
        policies.createPolicy();
        policies.fillNewPolicyForm(name);
        policies.backToPoliciesList();
        policies.checkStatus(name, "Draft");
        policies.exportPolicyAsFile(name);
    });

    it("Verify if it impossible to Export draft policy using message identifier", () => {
        policies.checkStatus(name, "Draft");
        policies.openExportModal(name);
        policies.verifyThatButtonDisabled(" Copy message identifier ");
    });

    it("Verify if it possible to Export dry run policy using file", () => {
        policies.startDryRun(name);
        policies.checkStatus(name, "In Dry Run");
        policies.exportPolicyAsFile(name);
    });

    it("Verify if it impossible to Export dry run policy using message identifier", () => {
        policies.checkStatus(name, "In Dry Run");
        policies.openExportModal(name);
        policies.verifyThatButtonDisabled(" Copy message identifier ");
    });

    it("Verify if it possible to Export published policy using file", () => {
        policies.publishPolicy(name);
        policies.backToPoliciesList();
        policies.checkStatus(name, "Published");
        policies.exportPolicyAsFile(name);
    });

    it("Verify if it possible to Export published policy using message identifier", () => {
        policies.checkStatus(name, "Published");
        policies.exportPolicyAsMessageId(name);
    });
});
