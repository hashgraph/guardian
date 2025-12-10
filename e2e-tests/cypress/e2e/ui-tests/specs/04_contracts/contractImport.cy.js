import { ContractsPage } from "../../pages/contractsPage";
const contractsPage = new ContractsPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Workflow Contract Import", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SR2User');
    const wipeContract = "wUIContract";
    const retireContract = "rUIContract";
    const wipeContractId = "0.0.5508551";
    const retireContractId = "0.0.5508555";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        contractsPage.openContractsTab();
    })

    it("Import contracts", () => {
        contractsPage.openContractTypeTab("wipe");
        contractsPage.importContract(wipeContractId);
        contractsPage.fillContract(wipeContract);
        contractsPage.openContractTypeTab("retire");
        contractsPage.importContract(retireContractId);
        contractsPage.fillContract(retireContract);
    });
});
