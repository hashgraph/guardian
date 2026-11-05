import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

import { PoliciesPage } from '../../pages/policiesPage';
const policiesPage = new PoliciesPage();

import { UserManagementPage } from '../../pages/userManagementPage';
const userManagementPage = new UserManagementPage();

import { UserPoliciesPage } from '../../pages/userPoliciesPage';
const userPoliciesPage = new UserPoliciesPage();

import { randomInt } from '../../../../support/random';

context('Workflow iREC 3 Policy', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const userUsername = Cypress.env('User');
    // one run name for the whole context run: both tests drive the same policy
    const runName = randomInt(1000000000) + 'testName';

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    it('Check ipfs and geoJSON validation input', () => {
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.importPolicyFromFile('test_Field_Validation.policy');  //iRec3
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
        userPoliciesPage.registerInPolicySmall('Registrant');
        userPoliciesPage.typeBadIPFS('ipfs://68baf2dbd3a44224b0bab19f');
        userPoliciesPage.validateListOfGeoJSONTypes();
    });

    it('Check geoJSON file input', () => {
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.validateGeoJSONFileImport('geoJSON.kml');
        userPoliciesPage.validateGeoJSONLargeFileImport('largeGeoJSON.kml');

    });
});
