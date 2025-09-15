import { ContractsPage } from "../../pages/contractsPage";
const contractsPage = new ContractsPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Workflow Contract UI Verify", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const wipeContract = "wUIContract";
    const retireContract = "rUIContract";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        contractsPage.openContractsTab();
    })

    it("verify ui", () => {
        contractsPage.openContractTypeTab("wipe");
        contractsPage.verifyButtonsAndHeaders();
        contractsPage.verifyContractDataAndActions(wipeContract);
        contractsPage.openContractTypeTab("retire");
        contractsPage.verifyButtonsAndHeaders();
        contractsPage.verifyContractDataAndActions(retireContract);
    });
});
