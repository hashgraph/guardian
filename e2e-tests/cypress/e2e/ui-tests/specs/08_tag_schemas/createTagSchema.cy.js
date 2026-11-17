import { randomInt } from '../../../../support/random';
import { SchemaPage } from '../../pages/schemaPage';
const schemaPage = new SchemaPage();

import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

const login = (username, schemasTab) => {
    cy.viewport(1920, 1080);
    homePage.visit();
    homePage.login(username);
    schemaPage.openSchemasTab(schemasTab);
};

context('Tag Schema Creation', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const schemaName = 'UITagSchema' + randomInt(1000000000);

    beforeEach(() => {
        login(SRUsername, 'tag');
    });

    it('create tag schema', () => {
        schemaPage.createSchema(schemaName);
    });

    after(() => {
        login(SRUsername, 'tag');
        schemaPage.deleteSchema(schemaName);
    });
});
