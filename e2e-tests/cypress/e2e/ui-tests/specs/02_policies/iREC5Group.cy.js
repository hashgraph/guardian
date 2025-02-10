import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

import { UserManagementPage } from "../../pages/userManagementPage";
const userManagementPage = new UserManagementPage();

import { UserPoliciesPage } from "../../pages/userPoliciesPage";
const userPoliciesPage = new UserPoliciesPage();

import { TokensPage } from "../../pages/tokensPage";
const tokensPage = new TokensPage();

context("Workflow iREC 5 Policy - with Groups(Approver/User)", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const userUsername = Cypress.env('User');
    const user2Username = Cypress.env('User2');
    const name = "iRec_5_1738942575774";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    it("checks iREC 5 policy workflow", () => {
        //Import and publish policy
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.importPolicyFromIPFS("1707126709.066208559"); //iRec5
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.publishPolicy(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Published");

        //Give permissions to user
        userManagementPage.openUserManagementTab();
        userManagementPage.assignPolicyToUser(userUsername, name);
        userManagementPage.openUserManagementTab();
        userManagementPage.assignPolicyToUser(user2Username, name);
        homePage.logOut();

        //Register user as Registrant and create application
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.registerInPolicy();
        homePage.logOut();

        //Register user as Approver
        homePage.login(user2Username);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.registerInPolicy("Approvers");
        //Approve application
        userPoliciesPage.approveUserInPolicy();
        homePage.logOut();

        //Create device
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.createDeviceInPolicy();
        homePage.logOut();

        //Approve device
        homePage.login(user2Username);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.approveDeviceInPolicy();
        homePage.logOut();

        //Create issue request
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        //TBD: verify that datepicker works
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.createIssueRequestInPolicy();
        homePage.logOut();

        //Approve issue request
        homePage.login(user2Username);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.approveIssueRequestInPolicy();
        homePage.logOut();

        //Verify balance increase
        homePage.login(SRUsername);
        tokensPage.openTokensTab();
        tokensPage.verifyBalance(name, userUsername);
        homePage.logOut();
    });
});
