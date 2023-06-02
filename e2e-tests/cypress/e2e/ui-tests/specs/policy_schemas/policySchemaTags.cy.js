import {AuthenticationPage} from "../../pages/authentication";
import {SchemasPage} from "../../pages/schemas";

const home = new AuthenticationPage();
const schemas = new SchemasPage();

describe("Policy Schema Tags", {tags: '@ui'}, () => {
    const tagName = Math.floor(Math.random() * 999) + "schemaTagTestUI";
    const schemaMessageId = "1685449525.907140003";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("create tag for policy schema", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.importPolicySchemaIPFS(schemaMessageId);
        schemas.addTag(tagName);
    });

    it("delete tag", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.deleteTag(tagName);
    });
});
