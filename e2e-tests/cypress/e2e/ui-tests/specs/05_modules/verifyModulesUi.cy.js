import { randomInt } from '../../../../support/random';
import { ModulesPage } from '../../pages/modulesPage';
const modulesPage = new ModulesPage();

import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

const login = (username) => {
    cy.viewport(1920, 1080);
    homePage.visit();
    homePage.login(username);
    modulesPage.openModulesTab();
};

// A published module cannot be deleted, so each run leaves the one it published in the list.
context('Verify Modules UI', { tags: ['@ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const runId = randomInt(1000000000);
    const draftModuleName = 'UIModule' + runId;
    const publishedModuleName = 'UIPublishedModule' + runId;

    before(() => {
        login(SRUsername);
        modulesPage.createNewModule(draftModuleName);
        modulesPage.createNewModule(publishedModuleName);
        modulesPage.publishModule(publishedModuleName);
    });

    beforeEach(() => {
        login(SRUsername);
    })

    it('verify ui', () => {
        modulesPage.verifyButtonsAndHeaders();
        modulesPage.verifyDraftModuleDataAndActions(draftModuleName);
        modulesPage.verifyPublishedModuleDataAndActions(publishedModuleName);
    });

    after(() => {
        modulesPage.openModulesTab();
        modulesPage.deleteModule(draftModuleName);
    });
});
