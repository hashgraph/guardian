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

context('Workflow Module Tags', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = 'UIModule' + randomInt(1000000000);
    const tagName = 'tagTestName';

    before(() => {
        login(SRUsername);
        modulesPage.createNewModule(moduleName);
    });

    beforeEach(() => {
        login(SRUsername);
    })

    it('add module tag', () => {
        modulesPage.addTag(moduleName, tagName);
    });

    it('delete module tag', () => {
        modulesPage.deleteTag(moduleName, tagName);
    });

    after(() => {
        modulesPage.openModulesTab();
        modulesPage.deleteModule(moduleName);
    });
});
