import {AuthenticationPage} from "../../pages/authentication";
import {SchemasPage} from "../../pages/schemas";

const home = new AuthenticationPage();
const schemas = new SchemasPage();

describe("System Schema Operations", {tags: '@ui'}, () => {
    const schemaNameForActivate = Math.floor(Math.random() * 999) + "schemaTestUI";
    const schemaNameForDeletion = Math.floor(Math.random() * 999) + "schemaTestUI";
    const schemaNameForDocument = Math.floor(Math.random() * 999) + "schemaTestUI";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("activate system schema", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.createSystemSchema(schemaNameForActivate);
        schemas.activateSystemSchema(schemaNameForActivate);
    });

    it("activate other system schema", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.activateOtherSystemSchema(schemaNameForActivate);
    });

    it("delete system schema", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.createSystemSchema(schemaNameForDeletion);
        schemas.deleteSystemSchema(schemaNameForDeletion);
    });

    it("policy schema document view", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.createSystemSchema(schemaNameForDocument);
        schemas.documentView();
    });
});
