import { randomInt } from '../../../../support/random';
import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

import { PoliciesPage } from '../../pages/policiesPage';
const policiesPage = new PoliciesPage();

context('Edit Policy. Switch mode flow', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    // A 1000-space name collides with policies left behind by earlier runs (the app
    // suffixes duplicates, so a name search then matches both) - 1e9 keeps re-runs unique.
    const name = randomInt(1000000000) + 'testName';

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
    });

    it('Verify if it possible to switch to json mode', () => {
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, 'Draft');
        policiesPage.openEditingPolicy(name);
        policiesPage.switchView('Tree');
        policiesPage.switchView('JSON');
        policiesPage.verifyIfContainerJsonIsDisplayed();
    });

    it('Verify if it possible to switch to tree mode', () => {
        policiesPage.openEditingPolicy(name);
        policiesPage.verifyIfTreeContainerIsDisplayed();
    });

    after(() => {
        policiesPage.backToPoliciesList();
        policiesPage.deletePolicy(name);
    });
});
