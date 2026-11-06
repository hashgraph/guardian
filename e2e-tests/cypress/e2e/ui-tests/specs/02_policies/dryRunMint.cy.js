import { HomePage } from '../../pages/homePage';
const homepage = new HomePage();

import { PoliciesPage } from '../../pages/policiesPage';
const policiesPage = new PoliciesPage();

import { UserPoliciesPage } from '../../pages/userPoliciesPage';
const userPoliciesPage = new UserPoliciesPage();

import { randomInt } from '../../../../support/random';

const IREC3_FILE = '../Methodology Library/International Renewable Energy Certificate (iREC)/Policies/IRec Policy 3 (1707126011.005978889).policy';

context('Dry run Policy', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const runName = randomInt(1000000000) + 'testName';

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        policiesPage.openPoliciesTab();
    })

    it('checks dry run with mint workflow', () => {
        //import and dry-run policy (file import: the localnode gateway does not
        //answer the IPFS message lookups the IPFS import needs)
        policiesPage.importPolicyFromFile(IREC3_FILE);
        policiesPage.renameImportedPolicy(runName);
        policiesPage.startDryRun(runName);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(runName, 'In Dry Run');
        policiesPage.openPolicy(runName);

        //Register user as Registrant and create application
        policiesPage.createDryRunUser();
        policiesPage.openDryRunUser();
        userPoliciesPage.registerInPolicy();

        //Approve application
        policiesPage.openDryRunUser('Administrator');
        policiesPage.approveUserInPolicy();

        //Create device
        policiesPage.openDryRunUser();
        userPoliciesPage.createDeviceInPolicy();

        //Approve device
        policiesPage.openDryRunUser('Administrator');
        policiesPage.approveDeviceInPolicy();

        //Create issue request
        policiesPage.openDryRunUser();
        userPoliciesPage.createIssueRequestInPolicy();

        //Approve issue request and verify balance increase
        policiesPage.openDryRunUser('Administrator');
        policiesPage.approveIssueRequestInPolicy();
    });

    after(() => {
        policiesPage.openPoliciesTab();
        policiesPage.stopDryRun(runName);
        policiesPage.deletePolicy(runName);
    });
});
