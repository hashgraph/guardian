import { randomInt } from '../../../../support/random';
import { publishSchema } from '../../../../support/CustomHelpers/ipfsSeeding';
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

context('Policy Schema Creation', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    // Unique per run: the schemas of earlier runs stay in the list.
    const schemaName = 'UIPolicySchema' + randomInt(1000000000);
    const schemaFileName = 'exportedSchema.schema';
    // The name the exported schema file carries.
    const schemaNameImportedFile = 'Lead User Details';
    let schemaNameImportedIPFS;
    let schemaMessageId;

    // A schema published on Hedera by the run itself, so the IPFS import does not depend on a testnet message.
    before(() => {
        publishSchema(SRUsername).then(({ messageId, name }) => {
            schemaMessageId = messageId;
            schemaNameImportedIPFS = name;
        });
    });

    beforeEach(() => {
        login(SRUsername);
    });

    it('create policy schema', () => {
        schemaPage.createSchema(schemaName);
    });

    it('import policy schema IPFS', () => {
        schemaPage.importPolicySchemaIPFS(schemaMessageId, schemaNameImportedIPFS);
    });

    it('import policy schema file', () => {
        schemaPage.importSchemaFile(schemaFileName, schemaNameImportedFile);
    });

    after(() => {
        login(SRUsername);
        schemaPage.deleteSchema(schemaName);
        schemaPage.deleteSchema(schemaNameImportedFile);
    });
});
