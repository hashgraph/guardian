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

context("Workflow iREC 3 Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const userUsername = Cypress.env('User');
    const name = "iRec_3";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    it("checks iREC 3 policy workflow", () => {
        //Import and publish policy
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.importPolicyFromIPFS("1707126011.005978889");  //iRec3
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.publishPolicy(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Published");

        //Give permissions to user
        userManagementPage.openUserManagementTab();
        userManagementPage.assignPolicyToUser(userUsername, name);
        homePage.logOut();

        //Token associate
        homePage.login(userUsername);
        tokensPage.openUserTokensTab();
        tokensPage.associatePolicyToken(name);
        //Register user as Registrant and create application
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.registerInPolicy();
        homePage.logOut();

        //Token grant KYC
        homePage.login(SRUsername);
        tokensPage.openTokensTab();
        tokensPage.grantKYC(name, userUsername);
        //Approve application
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
        userPoliciesPage.openPolicy(name);
        //TBD: verify that datepicker works
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
