import { AuthenticationPage } from "../../pages/authentication";
import { PoliciesPage } from "../../pages/policies";
import { InstallerPage } from "../../pages/intaller-page";
import { RegistrantPage } from "../../pages/registrant-page";
import { TokensPage } from "../../pages/tokens";

const home = new AuthenticationPage();
const policies = new PoliciesPage();
const registrant = new RegistrantPage();
const installer = new InstallerPage();
const tokens = new TokensPage();

describe("Workflow iREC 3 Policy",  { tags: '@ui' }, () => {
    it("checks iREC 3 policy workflow", () => {
        cy.viewport(1230, 800);

        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1675253928.926888003");  //iRec3
        policies.publishPolicy();
        home.logOut("StandardRegistry");

        //Registrant
        home.login("Registrant");
        home.checkSetup("Registrant");
        registrant.createGroup("Registrant");
        home.logOut("Registrant");

        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.approveUser();
        home.logOut("StandardRegistry");

        // Registrant?
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


    });
});

export {};
