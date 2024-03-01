import {AuthenticationPage} from "../../pages/authentication";
import {ContractsPage} from "../../pages/contracts";

const home = new AuthenticationPage();
const contracts = new ContractsPage();

describe("Workflow Contract Creation", {tags: '@ui'}, () => {

    const importedContract = Math.floor(Math.random() * 999) + "importedContractName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("verify ui", () => {
        home.login("StandardRegistryForSI14");
        contracts.openContractsTab();
        contracts.createContract(importedContract);
        contracts.verifyButtonsAndHeaders();
        contracts.verifyContractDataAndActions(importedContract);
    });
});
