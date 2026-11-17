import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

import { PoliciesPage } from '../../pages/policiesPage';
const policiesPage = new PoliciesPage();

import { UserManagementPage } from '../../pages/userManagementPage';
const userManagementPage = new UserManagementPage();

import { UserPoliciesPage } from '../../pages/userPoliciesPage';
const userPoliciesPage = new UserPoliciesPage();

import { randomInt } from '../../../../support/random';

context('Workflow iREC 3 Policy', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const userUsername = Cypress.env('User');
    const runName = randomInt(1000000000) + 'testName';

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    it('checks button hiding after discontinue', () => {
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.importPolicyFromFile('iRec_3_BtnFix.policy');  //iRec3
        policiesPage.renameImportedPolicy(runName);
        policiesPage.publishPolicy(runName);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(runName, 'Published');
        userManagementPage.openUserManagementTab();
        userManagementPage.assignPolicyToUser(userUsername, runName);
        homePage.logOut();

        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.registerInPolicy();
        homePage.logOut();

        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(runName);
        policiesPage.approveUserInPolicy();
        policiesPage.backToPoliciesListBtn();
        policiesPage.discontinuePolicy(runName);
        homePage.logOut();

        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.checkRevokeButtonDisappear();
        homePage.logOut();
    });
});
