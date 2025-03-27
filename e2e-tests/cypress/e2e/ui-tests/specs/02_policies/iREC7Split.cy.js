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

context("Workflow iREC 7 Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const userUsername = Cypress.env('User');
    const name = "iRec_7";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    it("checks iREC 7 policy workflow", () => {
        //Import and publish policy
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.importPolicyFromIPFS("1707130249.448431277");  //iRec7
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
        policiesPage.approveUserInPolicy("approvedLabel");
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
        policiesPage.approveDeviceInPolicy("approvedLabel");
        homePage.logOut();

        //Create issue request
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        //TBD: verify that datepicker works
        userPoliciesPage.createIssueRequestInPolicy('2000');
        homePage.logOut();

        //Approve issue request and verify balance increase
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(name);
        policiesPage.approveIssueRequestInPolicy("approvedLabel");
        tokensPage.openTokensTab();
        tokensPage.verifyBalance(name, userUsername, ' 2 ');
        homePage.logOut();
    });
});
