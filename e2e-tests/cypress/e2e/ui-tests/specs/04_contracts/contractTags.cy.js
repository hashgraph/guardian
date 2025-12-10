import { ContractsPage } from "../../pages/contractsPage";
const contractsPage = new ContractsPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Workflow Contract Tags", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const wipeContract = "wUIContract";
    const retireContract = "rUIContract";
    const tagName = "tagTestName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        contractsPage.openContractsTab();
    })

    it("add contract tag", () => {
        contractsPage.openContractTypeTab("wipe");
        contractsPage.addTag(wipeContract, tagName);
        contractsPage.openContractTypeTab("retire");
        contractsPage.addTag(retireContract, tagName);
    });

    it("delete contract tag", () => {
        contractsPage.openContractTypeTab("wipe");
        contractsPage.deleteTag(wipeContract, tagName);
        contractsPage.openContractTypeTab("retire");
        contractsPage.deleteTag(retireContract, tagName);
    });
});
