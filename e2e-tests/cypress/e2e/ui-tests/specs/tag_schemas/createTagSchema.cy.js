import {AuthenticationPage} from "../../pages/authentication";
import {SchemasPage} from "../../pages/schemas";

const home = new AuthenticationPage();
const schemas = new SchemasPage();

describe("Policy Schema Creation", {tags: '@ui'}, () => {
    const schemaName = Math.floor(Math.random() * 999) + "schemaTestUI";
    const schemaMessageId = "1685449525.907140003";
    const schemaFileName = "schemas_1685609943478.schema";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("create tag schema", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.createTagSchema(schemaName);
    });
});
