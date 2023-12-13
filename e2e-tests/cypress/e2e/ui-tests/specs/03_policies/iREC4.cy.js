
import {AuthenticationPage} from "../../pages/authentication";
import {PoliciesPage} from "../../pages/policies";
import {RegistrantPage} from "../../pages/registrant-page";
import {TokensPage} from "../../pages/tokens";

const home = new AuthenticationPage();
const policies = new PoliciesPage();
const registrant = new RegistrantPage();
const tokens = new TokensPage();

describe("Workflow iREC 4 Policy", {tags: '@ui'}, () => {

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("checks iREC 4 policy workflow", () => {
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1690484516.927729003");  //iRec4
        policies.openPoliciesTab();
        policies.publishPolicy();
        home.logOut("StandardRegistry");

        home.login("Registrant");
        home.checkSetup("Registrant");
        registrant.createGroup("Registrant");
        home.logOut("Registrant");

        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.approveUser();
        home.logOut("StandardRegistry");

        home.login("Registrant");
        registrant.createDevice();
        home.logOut("Registrant");

        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.approveDevice();
        home.logOut("StandardRegistry");

        home.login("Registrant");
        registrant.createIssueRequest();
        home.logOut("Registrant");

        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.approveRequest();
        home.logOut("StandardRegistry");

        home.login("Registrant");
        policies.openPoliciesTab();
        registrant.checkTokenHistory();
        registrant.openTokensTab();
        registrant.checkTokenBalance();
        home.logOut("Registrant");

        home.login("StandardRegistry");
        tokens.openTokensTab();
        policies.checkTokenHistory();
        policies.openPoliciesTab();
        policies.checkTrustChain();
        home.logOut("StandardRegistry");

    });
});
