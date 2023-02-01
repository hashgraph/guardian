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

describe("Workflow iREC 5 Policy",  { tags: '@ui' }, () => {
    it("checks iREC 5 policy workflow", () => {
        cy.viewport(1230, 800);

        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1675253928.926888003");  //iRec3
        policies.publishPolicy();
        home.logOut("StandardRegistry");

        // Registrant
        home.login("Registrant");
        home.checkSetup("Registrant");
        registrant.createGroup("Registrant");
        home.logOut("Registrant");

        // Installer
        home.login("Installer");
        home.checkSetup("Installer");
        installer.createGroup("Registrant");
        installer.okButton();
        // installer.signApplication();
        home.logOut("Installer");

        // Registrant
        home.login("Registrant");
        registrant.createDevice();
        home.logOut("Registrant");

         // Installer
         home.login("Installer");
         installer.approveDevice();
         home.logOut("Installer");
 
         home.login("StandardRegistry");

    });
});

export {};
