import {AuthenticationPage} from "../../pages/authentication";
import {PoliciesPage} from "../../pages/policies";
import {InstallerPage} from "../../pages/intaller-page";
import {RegistrantPage} from "../../pages/registrant-page";

const home = new AuthenticationPage();
const policies = new PoliciesPage();
const registrant = new RegistrantPage();
const installer = new InstallerPage();

describe("Workflow iREC 5 Policy", {tags: '@ui'}, () => {

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("checks iREC 5 policy workflow", () => {
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1690484619.627455003"); //iRec5
        policies.openPoliciesTab();
        policies.publishPolicy();
        home.logOut("StandardRegistry");

        home.login("Registrant");
        home.checkSetup("Registrant");
        registrant.createGroup("Registrant");
        home.logOut("Registrant");

        home.login("Installer");
        home.checkSetup("Installer");
        installer.createGroup("Approvers");
        installer.signApplication();
        home.logOut("Installer");

        home.login("Registrant");
        registrant.createDevice();
        home.logOut("Registrant");

        home.login("Installer");
        policies.openPoliciesTab();
        installer.approveDevice();
        home.logOut("Installer");

        home.login("Registrant");
        registrant.createIssueRequest();
        home.logOut("Registrant");

        home.login("Installer");
        policies.openPoliciesTab();
        policies.approveRequest();
        home.logOut("Installer");
    });
});
