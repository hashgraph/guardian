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
    const name = "test_Field_Validation";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    it("Check ipfs and geoJSON validation input", () => {
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.importPolicyFromFile("test_Field_Validation.policy");  //iRec3
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.publishPolicy(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Published");
        userManagementPage.openUserManagementTab();
        userManagementPage.assignPolicyToUser(userUsername, name);
        homePage.logOut();

        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.registerInPolicySmall("Registrant");
        userPoliciesPage.typeBadIPFS("ipfs://68baf2dbd3a44224b0bab19f");
        userPoliciesPage.validateListOfGeoJSONTypes();        
    });

    it("Check geoJSON file input", () => {
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(name);
        userPoliciesPage.validateGeoJSONFileImport("geoJSON.kml");
        userPoliciesPage.validateGeoJSONLargeFileImport("largeGeoJSON.kml");
        
    });
});
