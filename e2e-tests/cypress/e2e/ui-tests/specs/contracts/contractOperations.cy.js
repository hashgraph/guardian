import {AuthenticationPage} from "../../pages/authentication";
import {ContractsPage} from "../../pages/contracts";
import {TokensPage} from "../../pages/tokens";
import {RegistrantPage} from "../../pages/registrant-page";

const home = new AuthenticationPage();
const contracts = new ContractsPage();
const tokens = new TokensPage();
const registrant = new RegistrantPage();

describe("Workflow Contract Operations", {tags: '@ui'}, () => {
    const name = Math.floor(Math.random() * 999) + "contractName";
    const basicTokenName = Math.floor(Math.random() * 999) + "contractsToken";
    const oppositeTokenName = Math.floor(Math.random() * 999) + "contractsToken";
    const tagName = Math.floor(Math.random() * 999) + "tag";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("import contract for operations", () => {
        home.createNewSR("StandardRegistryForSI");
        contracts.openContractsTab();
        contracts.importContract(name);
        home.logOut("StandardRegistryForSI");
    });

    it("add pair", () => {
        home.login("StandardRegistryForSI");
        tokens.openTokensTab();
        tokens.createToken(basicTokenName);
        tokens.createToken(oppositeTokenName);
        contracts.openContractsTab();
        contracts.addPairToContract(name, basicTokenName, oppositeTokenName);
        home.logOut("StandardRegistry");
    });

    it("get registrant id", () => {
        home.login("Registrant");
        home.checkSetup("Registrant");
        registrant.openUserProfile();
        registrant.getId();
    });

    it("add user", () => {
        home.login("StandardRegistryForSI");
        contracts.openContractsTab();
        contracts.addUserToContract(name)
    });

    it("add contract tag", () => {
        home.login("StandardRegistryForSI");
        contracts.openContractsTab();
        contracts.addTag(tagName);
    });

    it("delete contract tag", () => {
        home.login("StandardRegistryForSI");
        contracts.openContractsTab();
        contracts.deleteTag(tagName);
    });
});
