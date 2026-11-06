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

const IREC5_FILE = '../Methodology Library/International Renewable Energy Certificate (iREC)/Policies/IRec Policy 5 (Groups) (1707126709.066208559).policy';

context('Workflow iREC 5 Policy - with Groups(Approver/User)', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const userUsername = Cypress.env('User');
    const user2Username = Cypress.env('User2');
    const runName = randomInt(1000000000) + 'testName';

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    it('checks iREC 5 policy workflow', () => {
        //The workspace does not seed User2; the workflow needs it for the
        //Approver role, so ensure it exists AND is onboarded (Hedera account
        //+ DID + parent registry). A re-run where it already is just bounces
        //off back to the login page.
        homePage.ensureAccount(user2Username, SRUsername);

        //Import and publish policy (file import: the localnode gateway does not
        //answer the IPFS message lookups the IPFS import needs)
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.importPolicyFromFile(IREC5_FILE);
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

        //Give permissions to users
        homePage.login(SRUsername);
        userManagementPage.openUserManagementTab();
        userManagementPage.assignPolicyToUser(userUsername, runName);
        userManagementPage.openUserManagementTab();
        userManagementPage.assignPolicyToUser(user2Username, runName);
        homePage.logOut();

        //Register user as Registrant and create application
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.registerInPolicy();
        homePage.logOut();

        //Register user as Approver and approve the application (multi-sign)
        homePage.login(user2Username);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.registerInPolicy('Approver');
        userPoliciesPage.approveUserInPolicy();
        homePage.logOut();

        //Create device
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.createDeviceInPolicy();
        homePage.logOut();

        //Approve device
        homePage.login(user2Username);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.approveDeviceInPolicy();
        homePage.logOut();

        //Create issue request
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        //TBD: verify that datepicker works
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.createIssueRequestInPolicy();
        homePage.logOut();

        //Approve issue request
        homePage.login(user2Username);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.approveIssueRequestInPolicy();
        homePage.logOut();

        //Verify balance increase
        homePage.login(SRUsername);
        tokensPage.openTokensTab();
        tokensPage.verifyBalance(runName, userUsername);
        homePage.logOut();
    });
});
