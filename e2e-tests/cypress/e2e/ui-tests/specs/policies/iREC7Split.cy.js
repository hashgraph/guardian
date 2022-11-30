import { AuthenticationPage } from "../../pages/authentication";
import { PoliciesPage } from "../../pages/policies";
import { InstallerPage } from "../../pages/intaller-page";
import { RegistrantPage } from "../../pages/registrant-page";
import { TokensPage } from "../../pages/tokens";
import API from "../../../../support/ApiUrls";

const home = new AuthenticationPage();
const policies = new PoliciesPage();
const registrant = new RegistrantPage();
const installer = new InstallerPage();
const tokens = new TokensPage();

describe("Workflow iREC 7 Policy", () => {
    const authorization = Cypress.env("authorization");

    it("checks iREC 7 policy workflow", () => {
        cy.viewport(1230, 800);

        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1666798058.496271367");
        policies.publishPolicy();
        home.logOut("StandardRegistry");



        // Registrant
        home.login("Registrant");
        home.checkSetup("Registrant");
        registrant.chooseRole("Registrant");
        home.logOut("Registrant");

        // Installer
        home.login("Installer");
        home.checkSetup("Installer");
        registrant.chooseRole("Registrant");
        home.logOut("Installer");

        home.login("StandardRegistry");
        policies.approve();
        home.logOut("StandardRegistry");

        // Registrant
        home.login("Registrant");
        registrant.createDevice();
        home.logOut("Registrant");

        home.login("StandardRegistry");
        policies.approveDevicebySR();
        home.logOut("StandardRegistry");

       
        // Registrant
        home.login("Registrant");
        registrant.createIssueRequest();


    });
});

export {};
