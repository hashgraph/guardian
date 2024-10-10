import {AuthenticationPage} from "../../pages/authentication";
import {ContractsPage} from "../../pages/contracts";

const home = new AuthenticationPage();
const contracts = new ContractsPage();

describe("Workflow Contract Creation", {tags: '@ui'}, () => {

    const name = Math.floor(Math.random() * 999) + "contractName";
    const importedContract = Math.floor(Math.random() * 999) + "importedContractName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("create contract", () => {
        home.login("StandardRegistry");
        contracts.openContractsTab();
        contracts.createContract(name);
    });

    it("import contract", () => {
        home.createNewSR("StandardRegistryForSI");
        contracts.openContractsTab();
        contracts.importContract(importedContract);
    });
});
