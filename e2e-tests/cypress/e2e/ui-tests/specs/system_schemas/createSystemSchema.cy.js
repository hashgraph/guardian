import {AuthenticationPage} from "../../pages/authentication";
import {SchemasPage} from "../../pages/schemas";

const home = new AuthenticationPage();
const schemas = new SchemasPage();

describe("System Schema Creation", {tags: '@ui'}, () => {
    const schemaName = Math.floor(Math.random() * 999) + "schemaTestUI";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("create policy schema", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.createSystemSchema(schemaName);
    });
});
