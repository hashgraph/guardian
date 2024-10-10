import {AuthenticationPage} from "../../pages/authentication";
import {SchemasPage} from "../../pages/schemas";

const home = new AuthenticationPage();
const schemas = new SchemasPage();

describe("Policy Schema Operations", {tags: '@ui'}, () => {
    const schemaNameForDeletion = Math.floor(Math.random() * 999) + "schemaTestUI";
    const schemaMessageId = "1685449525.907140003";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("publish policy schema", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.importPolicySchemaIPFS(schemaMessageId);
        schemas.publishPolicySchema();
    });

    it("delete policy schema", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.createPolicySchema(schemaNameForDeletion);
        schemas.deletePolicySchema(schemaNameForDeletion);
    });

    it("policy schema document view", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.importPolicySchemaIPFS(schemaMessageId);
        schemas.documentView();
    });
});
