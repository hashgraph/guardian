import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

context("Export Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        policiesPage.openPoliciesTab();
    })
    
    it("Verify if it possible to Export draft policy using file", () => {
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.exportPolicyAsFile(name);
    });

    it("Verify if it impossible to Export draft policy using message identifier", () => {
        policiesPage.checkStatus(name, "Draft");
        policiesPage.openExportModal(name);
        policiesPage.verifyThatButtonDisabled(" Copy message identifier ");
    });

    it("Verify if it possible to Export dry run policy using file", () => {
        policiesPage.startDryRun(name);
        policiesPage.checkStatus(name, "In Dry Run");
        policiesPage.exportPolicyAsFile(name);
    });

    it("Verify if it impossible to Export dry run policy using message identifier", () => {
        policiesPage.checkStatus(name, "In Dry Run");
        policiesPage.openExportModal(name);
        policiesPage.verifyThatButtonDisabled(" Copy message identifier ");
    });

    it("Verify if it possible to Export published policy using file", () => {
        policiesPage.publishPolicy(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Published");
        policiesPage.exportPolicyAsFile(name);
    });

    it("Verify if it possible to Export published policy using message identifier", () => {
        policiesPage.checkStatus(name, "Published");
        policiesPage.exportPolicyAsMessageId(name);
    });
});
