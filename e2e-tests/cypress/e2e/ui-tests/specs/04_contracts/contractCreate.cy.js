import { ContractsPage } from "../../pages/contractsPage";
const contractsPage = new ContractsPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Workflow Contract Creation", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const wipeContract = "wUIContract";
    const retireContract = "rUIContract";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        contractsPage.openContractsTab();
    })

    //TBD:  Full flow with retire tokens
    it("Create contracts", () => {
        contractsPage.openContractTypeTab("wipe");
        contractsPage.createContract();
        contractsPage.fillContract(wipeContract);
        contractsPage.openContractTypeTab("retire");
        contractsPage.createContract();
        contractsPage.fillContract(retireContract);
    });
});
