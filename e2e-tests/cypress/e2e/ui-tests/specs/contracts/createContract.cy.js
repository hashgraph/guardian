import { AuthenticationPage } from "../../pages/authentication";
import { ContractsPage } from "../../pages/contracts";
import { TokensPage } from "../../pages/tokens";

const home = new AuthenticationPage();
const contracts = new ContractsPage();
const tokens = new TokensPage();

describe("Workflow Contract Creation",  { tags: '@ui' }, () => {
    const name = Math.floor(Math.random() * 999) + "contractName";
    const basicTokenName = Math.floor(Math.random() * 999) + "contractsToken";
    const oppositeTokenName = Math.floor(Math.random() * 999) + "contractsToken";
    it("checks workflow", () => {
        cy.viewport(1440, 900);

        home.visit();
        home.login("StandardRegistry");
        contracts.openContractsTab();
        contracts.createContract(name);

        tokens.openTokensTab();
        tokens.createToken(basicTokenName);
        tokens.createToken(oppositeTokenName);

        contracts.openContractsTab();
        contracts.addPairToContract(name, basicTokenName, oppositeTokenName);
        home.logOut("StandardRegistry");
    });
});
