import { randomInt } from '../../../../support/random';
import { SchemaPage } from '../../pages/schemaPage';
const schemaPage = new SchemaPage();

import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

const login = (username) => {
    cy.viewport(1920, 1080);
    homePage.visit();
    homePage.login(username);
    schemaPage.openSchemasTab();
    schemaPage.openSchemasSubtab('Policy');
};

context('Policy Schema Tags', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const schemaName = 'UIPolicySchemaTags' + randomInt(1000000000);
    const tagName = 'tagTestName';

    before(() => {
        login(SRUsername);
        schemaPage.createSchema(schemaName);
    });

    beforeEach(() => {
        login(SRUsername);
    });

    it('create tag for policy schema', () => {
        schemaPage.addTag(schemaName, tagName);
    });

    it('delete tag', () => {
        schemaPage.deleteTag(schemaName, tagName);
    });

    after(() => {
        login(SRUsername);
        schemaPage.deleteSchema(schemaName);
    });
});
