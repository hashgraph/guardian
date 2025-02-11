import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

context("Import Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const importedFromFilePolicyName = "60testName";
    const importedFromIPFSPolicyName = "406testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        policiesPage.openPoliciesTab();
    })

    it("Verify if it possible to Import published policy from file", () => {
        policiesPage.importPolicyFromFile("policyImportPublished.policy");
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(importedFromFilePolicyName, "Draft");
    });

    it("Verify if it possible to Import published policy from IPFS", () => {
        policiesPage.importPolicyFromIPFS("1738845461.094286000");
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(importedFromIPFSPolicyName, "Draft");
    });
});
