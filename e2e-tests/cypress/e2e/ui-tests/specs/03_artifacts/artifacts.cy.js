import { randomInt } from '../../../../support/random';
import { HomePage } from '../../pages/homePage';
const homepage = new HomePage();

import { ArtifactsPage } from '../../pages/artifactsPage';
const artifactsPage = new ArtifactsPage();

import { PoliciesPage } from '../../pages/policiesPage';
const policiesPage = new PoliciesPage();

context('Artifacts', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    // A per-run policy keeps the artifacts table isolated, so re-runs are clean
    // even if rows left behind by earlier runs still exist.
    const runName = randomInt(1000000000) + 'testName';

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        artifactsPage.openArtifactsTab();
    })

    it('Verify if it possible to Import artifacts from file', () => {
        policiesPage.openPoliciesTab();
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(runName);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(runName, 'Draft');
        artifactsPage.openArtifactsTab();
        artifactsPage.importArtifactFrom(runName, 'artifactsImport.policy');
        artifactsPage.filterByPolicy(runName);
        artifactsPage.checkRowExists(runName, 'artifactsImport');
    });

    it('Verify if it possible to delete Imported artifact', () => {
        artifactsPage.importArtifactFrom(runName, 'artifactsImport.policy');
        artifactsPage.filterByPolicy(runName);
        artifactsPage.deleteAllRowsForPolicy(runName);
        artifactsPage.assertEmpty();
    });

    after(() => {
        policiesPage.openPoliciesTab();
        policiesPage.deletePolicy(runName);
    });
});
