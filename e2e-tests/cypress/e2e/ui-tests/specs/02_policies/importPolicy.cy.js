import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { PoliciesPage } from "../../pages/policies";
const policies = new PoliciesPage();

context("Import Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const importedFromFilePolicyName = "60testName";
    const importedFromIPFSPolicyName = "406testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        policies.openPoliciesTab();
    })

    it("Verify if it possible to Import published policy from file", () => {
        policies.importPolicyFromFile("policyImportPublished.policy");
        policies.backToPoliciesList();
        policies.checkStatus(importedFromFilePolicyName, "Draft");
    });

    it("Verify if it possible to Import published policy from IPFS", () => {
        policies.importPolicyFromIPFS("1738845461.094286000");
        policies.backToPoliciesList();
        policies.checkStatus(importedFromIPFSPolicyName, "Draft");
    });
});
