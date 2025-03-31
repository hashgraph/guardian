import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

import { UserPoliciesPage } from "../../pages/userPoliciesPage";
const userPoliciesPage = new UserPoliciesPage();

context("Dry run Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = "iRec_3";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        policiesPage.openPoliciesTab();
    })

    it("checks dry run with mint workflow", () => {
        //import and dry-run policy
        policiesPage.importPolicyFromIPFS("1707126011.005978889");  //iRec3
        policiesPage.backToPoliciesList();
        policiesPage.startDryRun(name);
        policiesPage.checkStatus(name, "In Dry Run");
        policiesPage.openPolicy(name);

        //Register user as Registrant and create application
        policiesPage.createDryRunUser();
        policiesPage.openDryRunUser();
        userPoliciesPage.registerInPolicy();

        //Approve application
        policiesPage.openDryRunUser("Administrator");
        policiesPage.approveUserInPolicy();

        //Create device
        policiesPage.openDryRunUser();
        userPoliciesPage.createDeviceInPolicy();

        //Approve device
        policiesPage.openDryRunUser("Administrator");
        policiesPage.approveDeviceInPolicy();

        //Create issue request
        policiesPage.openDryRunUser();
        userPoliciesPage.createIssueRequestInPolicy();

        //Approve issue request and verify balance increase
        policiesPage.openDryRunUser("Administrator");
        policiesPage.approveIssueRequestInPolicy();
    });

    after(() => {
        policiesPage.openPoliciesTab();
        policiesPage.stopDryRun(name);
        policiesPage.deletePolicy(name);
    });
});
