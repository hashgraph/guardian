import { randomInt } from '../../../../support/random';
import { publishSchema } from '../../../../support/CustomHelpers/ipfsSeeding';
import { createDraftPolicy, deleteDraftPolicy } from '../../../../support/api/policies';
import * as Authorization from '../../../../support/authorization';
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

    const SRUsername = Cypress.expose('SRUser');
    // Unique per run: the schemas of earlier runs stay in the list.
    const schemaName = 'UIPolicySchema' + randomInt(1000000000);
    const schemaFileName = 'exportedSchema.schema';
    // The name the exported schema file carries.
    const schemaNameImportedFile = 'Lead User Details';
    let schemaNameImportedIPFS;
    let schemaMessageId;
    // The imports go to a draft policy of the spec's own: another policy may already hold a schema of the
    // same name. Deleting the policy deletes the schemas imported into it.
    const policyName = 'UIPolicyForSchemaImport' + randomInt(1000000000);
    let policyId;

    // A schema published on Hedera by the run itself, so the IPFS import does not depend on a testnet message.
    before(() => {
        publishSchema(SRUsername).then(({ messageId, name }) => {
            schemaMessageId = messageId;
            schemaNameImportedIPFS = name;
        });
        Authorization.getAccessToken(SRUsername).then((authorization) =>
            createDraftPolicy(authorization, policyName).then((id) => {
                policyId = id;
            }));
    });

    beforeEach(() => {
        login(SRUsername);
    });

    it('create policy schema', () => {
        schemaPage.createSchema(schemaName);
    });

    it('import policy schema IPFS', () => {
        schemaPage.importPolicySchemaIPFS(schemaMessageId, schemaNameImportedIPFS, policyName);
    });

    it('import policy schema file', () => {
        schemaPage.importSchemaFile(schemaFileName, schemaNameImportedFile, policyName);
    });

    after(() => {
        login(SRUsername);
        schemaPage.deleteSchema(schemaName);
        if (policyId) {
            Authorization.getAccessToken(SRUsername).then((authorization) => deleteDraftPolicy(authorization, policyId));
        }
    });
});
