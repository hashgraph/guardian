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

context("Workflow iREC 4 Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const userUsername = Cypress.env('User');
    const name = "iRec_4";

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
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.registerInPolicy();
        homePage.logOut();

        //Approve application
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(name);
        policiesPage.approveUserInPolicy();
        homePage.logOut();

        //Create device
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.createDeviceInPolicy();
        homePage.logOut();

        //Approve device
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(name);
        policiesPage.approveDeviceInPolicy();
        homePage.logOut();

        //Create issue request
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        //TBD: verify that datepicker works
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.createIssueRequestInPolicy();
        homePage.logOut();

        //Approve issue request and verify balance increase
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(name);
        policiesPage.approveIssueRequestInPolicy();
        tokensPage.openTokensTab();
        tokensPage.verifyBalance(name, userUsername);
        homePage.logOut();
    });
});
