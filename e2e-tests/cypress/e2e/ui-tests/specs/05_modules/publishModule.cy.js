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
context('Workflow Modules Publish', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = 'UIModule' + randomInt(1000000000);

    before(() => {
        login(SRUsername);
        modulesPage.createNewModule(moduleName);
    });

    beforeEach(() => {
        login(SRUsername);
    })

    it('module publish', () => {
        modulesPage.publishModule(moduleName);
    });

    it('Verify if it possible to Export published module using message identifier', () => {
        modulesPage.exportModuleAsMessageId(moduleName);
    });

    it('Verify if it possible to Export published module using file', () => {
        modulesPage.checkStatus(moduleName, 'Published');
        modulesPage.exportModuleAsFile(moduleName);
    });
});
