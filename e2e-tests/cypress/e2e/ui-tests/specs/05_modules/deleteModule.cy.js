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

context('Workflow Module Deletion', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleNameFileImported = 'ComparedModuleFile';

    beforeEach(() => {
        login(SRUsername);
    })

    it('module deletion', () => {
        modulesPage.importNewModuleFile('comparedModuleFile.module', moduleNameFileImported);
        modulesPage.deleteModule(moduleNameFileImported);
    });
});
