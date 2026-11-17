import { randomInt } from '../../../../support/random';
import { createSystemSchema } from '../../../../support/CustomHelpers/systemSchemas';
import { SchemaPage } from '../../pages/schemaPage';
const schemaPage = new SchemaPage();

import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

const login = (username) => {
    cy.viewport(1920, 1080);
    homePage.visit();
    homePage.login(username);
    schemaPage.openSchemasTab('system');
};

context('System Schema Creation', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    // Unique per run: the schemas of earlier runs stay in the list.
    const schemaName = 'UISystemSchema' + randomInt(1000000000);
    const editorSchemaName = 'UIEditorSystemSchema' + randomInt(1000000000);

    before(() => {
        createSystemSchema(SRUsername, schemaName);
    });

    beforeEach(() => {
        login(SRUsername);
    });

    it('create system schema', () => {
        schemaPage.createSchema(editorSchemaName);
        schemaPage.systemSchemaEntity(editorSchemaName).should('eq', 'STANDARD_REGISTRY');
    });

    it('lists a system schema created through the API', () => {
        schemaPage._row(schemaName).should('exist');
    });

    after(() => {
        login(SRUsername);
        schemaPage.deleteSchema(schemaName);
        schemaPage.deleteSchema(editorSchemaName);
    });
});
