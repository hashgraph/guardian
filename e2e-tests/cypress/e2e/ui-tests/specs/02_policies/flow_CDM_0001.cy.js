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


context("Workflow CDM ACM 0001 Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const userUsername = Cypress.env('User');
    const user2Username = Cypress.env('User2');
    const name = "ACM0001";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    it("checks verra policy workflow", () => {
        //Import and publish policy
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.importPolicyFromIPFS("1719335230.464978003"); //CDM ACM0001
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


        //Token associate
        homePage.login(userUsername);
        tokensPage.openUserTokensTab();
        tokensPage.associatePolicyToken(name);
        //Register user as PP and create project
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.registerInPolicy("Project Participant");
        homePage.logOut();

        //Register user as VVB
        homePage.login(user2Username);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.registerInPolicy("VVB");
        homePage.logOut();

        //Token grant KYC
        homePage.login(SRUsername);
        tokensPage.openTokensTab();
        tokensPage.grantKYC(name, userUsername);
        //Approve roles and add project
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(name);
        policiesPage.approveUserInPolicy();
        policiesPage.openVVBTab();
        policiesPage.approveUserInPolicy();
        homePage.logOut();

        //Create project
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.createProject();
        homePage.logOut();

        //Approve project
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(name);
        policiesPage.approveProject();
        homePage.logOut();

        //Create report
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.createReport();
        userPoliciesPage.assignReport();
        homePage.logOut();

        //Verify report
        homePage.login(user2Username);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.verifyReport();
        homePage.logOut();

        //Approve report
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(name);
        policiesPage.approveReport();
        tokensPage.openTokensTab();
        tokensPage.verifyBalance(name, userUsername, " 85 ");
        homePage.logOut();
    });
});
