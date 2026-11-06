import { randomInt } from '../../../../support/random';
import { PoliciesPage } from '../../pages/policiesPage';
const policiesPage = new PoliciesPage();

import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

context('Error Validation on schema fields', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = randomInt(1000000000) + 'policyForValidation';

    before(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        // From file: the testnet message it was published as does not exist on other networks.
        policiesPage.importPolicyFromFile('policyForValidation.policy');
        policiesPage.renameImportedPolicy(name);
        policiesPage.startDryRun(name);
        policiesPage.checkStatus(name, 'In Dry Run');
    });

    it('Error Validation on schema fields', () => {
        policiesPage.openPolicy(name);
        policiesPage.validateTypesDefault();
        policiesPage.validateTypesRequired();
        policiesPage.validateTypesMultiplie();
        policiesPage.validateTypesMultiplieRequired();
    });

    after(() => {
        // visit() boots the app with a clean storage, which logs the user out.
        homePage.visit();
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.stopDryRun(name);
        policiesPage.deletePolicy(name);
    });
});