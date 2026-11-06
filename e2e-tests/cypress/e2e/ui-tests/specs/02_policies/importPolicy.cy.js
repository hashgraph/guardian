import { HomePage } from '../../pages/homePage';
const homepage = new HomePage();

import { PoliciesPage } from '../../pages/policiesPage';
const policiesPage = new PoliciesPage();

import { randomInt } from '../../../../support/random';

context('Import Policy', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    // each test imports its own copy of a fixed-name artifact and renames it,
    // so leftovers from earlier runs can never collide with the current run
    let runName = '';

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        policiesPage.openPoliciesTab();
        runName = randomInt(1000000000) + 'testName';
    })

    it('Verify if it possible to Import published policy from file', () => {
        policiesPage.importPolicyFromFile('policyImportPublished.policy');
        policiesPage.renameImportedPolicy(runName);
        policiesPage.checkStatus(runName, 'Draft');
    });

    it('Verify if it possible to Import draft policy from file', () => {
        // The IPFS import is structurally unavailable on localnode (the gateway
        // has no topic/message lookups), so the second import also uses a file.
        policiesPage.importPolicyFromFile('policyImportDraft.policy');
        policiesPage.renameImportedPolicy(runName);
        policiesPage.checkStatus(runName, 'Draft');
    });

    after(() => {
        policiesPage.deletePolicy(runName);
    });
});
