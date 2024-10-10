import {AuthenticationPage} from "../../pages/authentication";
import {ContractsPage} from "../../pages/contracts";

const home = new AuthenticationPage();
const contracts = new ContractsPage();

describe("Workflow Contract Operations", {tags: '@ui'}, () => {
    const tagName = Math.floor(Math.random() * 999) + "tag";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("add contract tag", () => {
        home.login("StandardRegistryForSI14");
        contracts.openContractsTab();
        contracts.addTag(tagName);
    });

    it("delete contract tag", () => {
        home.login("StandardRegistryForSI14");
        contracts.openContractsTab();
        contracts.deleteTag(tagName);
    });
});
