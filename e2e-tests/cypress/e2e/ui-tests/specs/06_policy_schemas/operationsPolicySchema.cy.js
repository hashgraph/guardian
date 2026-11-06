import { randomInt } from '../../../../support/random';
import { createDraftSchema, publishSchema } from '../../../../support/CustomHelpers/ipfsSeeding';
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

// Published schemas cannot be deleted, so the ones this spec publishes stay in the list.
context('Policy Schema Operations', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const runId = randomInt(1000000000);
    const schemaNameToDelete = 'UIPolicySchemaDelete' + runId;
    const schemaNameToEdit = 'UIPolicySchemaEdit' + runId;
    const schemaNameEdited = schemaNameToEdit + 'Updated';
    let publishedSchemaName;
    let schemaNameToPublish;

    before(() => {
        publishSchema(SRUsername).then(({ name }) => {
            publishedSchemaName = name;
        });
        // A schema must belong to a policy to be published, which the editor cannot do from the list.
        createDraftSchema(SRUsername).then(({ name }) => {
            schemaNameToPublish = name;
        });
        login(SRUsername);
        schemaPage.createSchema(schemaNameToDelete);
        schemaPage.createSchema(schemaNameToEdit);
    });

    beforeEach(() => {
        login(SRUsername);
    });

    it('policy schema document view', () => {
        schemaPage.documentView(schemaNameToDelete);
    });

    it('delete policy schema', () => {
        schemaPage.deleteSchema(schemaNameToDelete);
    });

    it('publish policy schema', () => {
        schemaPage.publishPolicySchema(schemaNameToPublish);
    });

    it('Export by File', () => {
        schemaPage.exportSchemaFile(publishedSchemaName);
    });

    it('Export by IPFS', () => {
        schemaPage.exportSchemaIPFS(publishedSchemaName);
    });

    // TODO: 5039 Schemas compare fix
    // it("Compare Policy Schema", () => {
    //     schemaPage.comparePolicySchema(schemaNameImportedIPFS, schemaNameImportedFile);
    // });

    it('Edit Policy schema', () => {
        schemaPage.editPolicySchema(schemaNameToEdit, schemaNameEdited);
    });

    after(() => {
        login(SRUsername);
        schemaPage.deleteSchema(schemaNameEdited);
    });
});
