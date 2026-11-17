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

context('System Schema Operations', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const runId = randomInt(1000000000);
    const schemaName = 'UISystemSchema' + runId;
    const schemaName2 = 'UISystemSchemaActive' + runId;
    // Standard Registry has a built-in system schema to give the entity back to; User has none.
    const entity = 'STANDARD_REGISTRY';

    before(() => {
        createSystemSchema(SRUsername, schemaName, entity);
        createSystemSchema(SRUsername, schemaName2, entity);
    });

    beforeEach(() => {
        login(SRUsername);
    });

    it('policy schema document view', () => {
        schemaPage.documentView(schemaName);
    });

    it('delete system schema', () => {
        schemaPage.deleteSchema(schemaName);
    });

    it('activate system schema', () => {
        schemaPage.activateSystemSchema(schemaName2);
    });

    // Activating the schema took the entity away from the built-in one, which the rest of the app uses.
    after(() => {
        login(SRUsername);
        schemaPage.activateBuiltInSystemSchema(entity);
        schemaPage.deleteSchema(schemaName2);
    });
});
