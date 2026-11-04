import { randomInt } from '../../../../support/random';
import { HomePage } from '../../pages/homePage';
const homepage = new HomePage();

import { PoliciesPage } from '../../pages/policiesPage';
const policiesPage = new PoliciesPage();

context('Dry run Policy', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    // A 1000-space name collides with policies left behind by earlier runs (the app
    // suffixes duplicates, so a name search then matches both) - 1e9 keeps re-runs unique.
    const name = randomInt(1000000000) + 'testName';

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        policiesPage.openPoliciesTab();
    })

    //TBD: Full policy flow with tokens minting
    it('checks dry run workflow', () => {
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, 'Draft');
        policiesPage.startDryRun(name);
        policiesPage.checkStatus(name, 'In Dry Run');
        policiesPage.stopDryRun(name);
    });

    after(() => {
        policiesPage.deletePolicy(name);
    });
});
