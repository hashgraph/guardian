import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

import { PoliciesPage } from '../../pages/policiesPage';
const policiesPage = new PoliciesPage();

import { UserManagementPage } from '../../pages/userManagementPage';
const userManagementPage = new UserManagementPage();

import { UserPoliciesPage } from '../../pages/userPoliciesPage';
const userPoliciesPage = new UserPoliciesPage();

import { TokensPage } from '../../pages/tokensPage';
const tokensPage = new TokensPage();

import { randomInt } from '../../../../support/random';

const IREC4_FILE = '../Methodology Library/International Renewable Energy Certificate (iREC)/Policies/IRec Policy 4 (1707126227.976010003).policy';

context('Workflow iREC 4 Policy', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const userUsername = Cypress.env('User');
    const runName = randomInt(1000000000) + 'testName';

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    it('checks iREC 4 policy workflow', () => {
        //Import and publish policy (file import: the localnode gateway does not
        //answer the IPFS message lookups the IPFS import needs)
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.importPolicyFromFile(IREC4_FILE);
        policiesPage.renameImportedPolicy(runName);
        policiesPage.publishPolicy(runName);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(runName, 'Published');

        //The token must be associated with the user's Hedera account before
        //the workflow can transfer it. /tokens-user is restricted to the USER
        //role, so the SR (STANDARD_REGISTRY) cannot open it: the SR reads the
        //token id from the /tokens grid, and the user then self-associates
        //from the per-token view, which lists the viewer's own account.
        tokensPage.openTokensTab();
        tokensPage.storeTokenId(runName);
        homePage.logOut();

        homePage.login(userUsername);
        tokensPage.associatePolicyToken();
        homePage.logOut();

        //Give permissions to user
        homePage.login(SRUsername);
        userManagementPage.openUserManagementTab();
        userManagementPage.assignPolicyToUser(userUsername, runName);
        homePage.logOut();

        //Register user as Registrant and create application
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.registerInPolicy();
        homePage.logOut();

        //Approve application
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(runName);
        policiesPage.approveUserInPolicy();
        homePage.logOut();

        //Create device
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.createDeviceInPolicy();
        homePage.logOut();

        //Approve device
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(runName);
        policiesPage.approveDeviceInPolicy();
        homePage.logOut();

        //Create issue request
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        //TBD: verify that datepicker works
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.createIssueRequestInPolicy();
        homePage.logOut();

        //Approve issue request and verify balance increase
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(runName);
        policiesPage.approveIssueRequestInPolicy();
        tokensPage.openTokensTab();
        tokensPage.verifyBalance(runName, userUsername);
        homePage.logOut();
    });
});
