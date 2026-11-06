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

// A published schema cannot be deleted, so the one this spec publishes stays in the list.
context('Tag Schema Operations', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const runId = randomInt(1000000000);
    const schemaName = 'UITagSchema' + runId;
    const schemaName2 = 'UITagSchemaPublish' + runId;

    before(() => {
        login(SRUsername, 'tag');
        schemaPage.createSchema(schemaName);
        schemaPage.createSchema(schemaName2);
    });

    beforeEach(() => {
        login(SRUsername, 'tag');
    });

    it('tag schema document view', () => {
        schemaPage.documentView(schemaName);
    });

    it('delete tag schema', () => {
        schemaPage.deleteSchema(schemaName);
    });

    it('publish tag schema', () => {
        schemaPage.publishTagSchema(schemaName2);
    });
});
