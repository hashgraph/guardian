import {AuthenticationPage} from "../../pages/authentication";
import {ContractsPage} from "../../pages/contracts";
import {TokensPage} from "../../pages/tokens";
import {RegistrantPage} from "../../pages/registrant-page";

const home = new AuthenticationPage();
const contracts = new ContractsPage();
const tokens = new TokensPage();
const registrant = new RegistrantPage();

describe("Workflow Contract Operations", {tags: '@ui'}, () => {
    const name = Math.floor(Math.random() * 999) + "contractsName";
    const basicTokenName = Math.floor(Math.random() * 999) + "contractsToken";
    const oppositeTokenName = Math.floor(Math.random() * 999) + "contractsToken";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("import contract for operations", () => {
        home.createNewSR("StandardRegistryForSI14");
        contracts.openContractsTab();
        // contracts.importContract(name);
        contracts.createContract(name);
        home.logOut("StandardRegistryForSI14");
    });

    it("add pair", () => {
        home.login("StandardRegistryForSI14");
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
        home.login("StandardRegistryForSI14");
        contracts.openContractsTab();
        contracts.addUserToContract(name)
    });
});
