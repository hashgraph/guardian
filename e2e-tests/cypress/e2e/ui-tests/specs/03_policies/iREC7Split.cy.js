import { AuthenticationPage } from "../../pages/authentication";
import { PoliciesPage } from "../../pages/policies";
import { RegistrantPage } from "../../pages/registrant-page";

const home = new AuthenticationPage();
const policies = new PoliciesPage();
const registrant = new RegistrantPage();

describe("Workflow iREC 7 Policy", () => {

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("checks iREC 7 policy workflow",{ tags: '@ui' },  () => {
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1690484932.571897003");  //iRec7
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
    });
});
