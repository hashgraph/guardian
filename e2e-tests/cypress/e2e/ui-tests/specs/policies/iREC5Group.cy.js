import { HomePage } from "../../pages/homepage";
import { PoliciesPage } from "../../pages/policies";
import { InstallerPage } from "../../pages/intaller-page";
import { RegistrantPage } from "../../pages/registrant-page";
import { TokensPage } from "../../pages/tokens";
import API from "../../../../support/ApiUrls";

const home = new HomePage();
const policies = new PoliciesPage();
const registrant = new RegistrantPage();
const installer = new InstallerPage();
const tokens = new TokensPage();

describe("Workflow iREC 5 Policy", () => {
    const authorization = Cypress.env("authorization");

    it("checks iREC 5 policy workflow", () => {
        cy.viewport(1230, 800);

        home.visit();
        home.loginAsStandartRegistry();
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1663850151.496004277");
        policies.publishPolicy();
        home.logoutAsStandartRegistry();

        // Registrant
        home.loginAsRegistrant();
        home.checkSetupRegistrant();
        registrant.createGroup("Registrant");
        home.logoutAsRegistrant();

        // Installer
        home.loginAsInstaller();
        home.checkSetupInstaller();
        installer.createGroup("Approvers");
        installer.signApplication();
        home.logoutAsInstaller();

        // Registrant
        home.loginAsRegistrant();
        registrant.createDevice();
        home.logoutAsRegistrant();

         // Installer
         home.loginAsInstaller();
         installer.approveDevice();
         home.logoutAsInstaller();
 
         home.loginAsStandartRegistry();

    });
});

export {};
