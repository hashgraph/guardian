import { HomePage } from "../ui-tests/pages/homePage";
const homePage = new HomePage();

import { PoliciesPage } from "../ui-tests/pages/policiesPage";
const policiesPage = new PoliciesPage();

import { UserManagementPage } from "../ui-tests/pages/userManagementPage";
const userManagementPage = new UserManagementPage();

import { UserPoliciesPage } from "../ui-tests/pages/userPoliciesPage";
const userPoliciesPage = new UserPoliciesPage();

import { TokensPage } from "../ui-tests/pages/tokensPage";
const tokensPage = new TokensPage();

context("Workflow iREC 4 Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const userUsername = Cypress.env('User');
    const name = "iRec_4_1738936261393";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    it("checks iREC 4 policy workflow", () => {
        //Import and publish policy
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.importPolicyFromIPFS("1707126227.976010003");  //iRec4
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.publishPolicy(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Published");

        //Give permissions to user
        userManagementPage.openUserManagementTab();
        userManagementPage.assignPolicyToUser(userUsername, name);
        homePage.logOut();

        //Register user as Registrant and create application
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.registerInPolicy(name);
        homePage.logOut();

        //Approve application
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.approveUserInPolicy(name);
        homePage.logOut();

        //Create device
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.createDeviceInPolicy(name);
        homePage.logOut();

        //Approve device
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.approveDeviceInPolicy(name);
        homePage.logOut();

        //Create issue request
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        //TBD: verify that datepicker works
        userPoliciesPage.createIssueRequestInPolicy(name);
        homePage.logOut();

        //Approve issue request and verify balance increase
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.approveIssueRequestInPolicy(name);
        tokensPage.openTokensTab();
        tokensPage.verifyBalance(name, userUsername);
        homePage.logOut();
    });
});
