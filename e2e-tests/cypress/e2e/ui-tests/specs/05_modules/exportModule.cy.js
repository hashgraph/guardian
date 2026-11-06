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

context('Workflow Module Export', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = 'UIModule' + randomInt(1000000000);

    before(() => {
        login(SRUsername);
        modulesPage.createNewModule(moduleName);
    });

    beforeEach(() => {
        login(SRUsername);
    })

    it('Verify if it impossible to Export draft module using message identifier', () => {
        modulesPage.checkStatus(moduleName, 'Draft');
        modulesPage.openExportModal(moduleName);
        modulesPage.verifyThatButtonDisabled('Copy message identifier');
    });

    it('Verify if it possible to Export draft module using file', () => {
        modulesPage.checkStatus(moduleName, 'Draft');
        modulesPage.exportModuleAsFile(moduleName);
    });

    after(() => {
        modulesPage.openModulesTab();
        modulesPage.deleteModule(moduleName);
    });
});
