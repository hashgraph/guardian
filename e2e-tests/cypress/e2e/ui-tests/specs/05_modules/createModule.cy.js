import { randomInt } from '../../../../support/random';
import { seededMessageId } from '../../../../support/CustomHelpers/ipfsSeeding';
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

context('Workflow Module Creation', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    // Unique per run: the modules of earlier runs stay in the list.
    const moduleName = 'UIModule' + randomInt(1000000000);
    // Imported archives keep the name they were exported with. The module imported from a Hedera message is
    // already published, so it cannot be deleted and stays in the list.
    const moduleNameIPFSImported = 'ComparedModuleIPFS';
    const moduleNameFileImported = 'ComparedModuleFile';

    beforeEach(() => {
        login(SRUsername);
    })

    it('module creation', () => {
        modulesPage.createNewModule(moduleName);
    });

    it('module ipfs import', () => {
        seededMessageId('module_for_import').then((messageId) => {
            modulesPage.importNewModuleIPFS(messageId, moduleNameIPFSImported);
        });
    });

    it('module file import', () => {
        modulesPage.importNewModuleFile('comparedModuleFile.module', moduleNameFileImported);
    });

    after(() => {
        modulesPage.openModulesTab();
        modulesPage.deleteModule(moduleName);
        modulesPage.deleteModule(moduleNameFileImported);
    });
});
