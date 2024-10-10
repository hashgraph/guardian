import {AuthenticationPage} from "../../pages/authentication";
import {SchemasPage} from "../../pages/schemas";

const home = new AuthenticationPage();
const schemas = new SchemasPage();

describe("Policy Schema Operations", {tags: '@ui'}, () => {
    const schemaNameForPublish = Math.floor(Math.random() * 999) + "schemaTestUI";
    const schemaNameForDeletion = Math.floor(Math.random() * 999) + "schemaTestUI";
    const schemaNameForDocument = Math.floor(Math.random() * 999) + "schemaTestUI";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("publish tag schema", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.createTagSchema(schemaNameForPublish);
        schemas.publishTagSchema(schemaNameForPublish);
    });

    it("delete tag schema", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.createTagSchema(schemaNameForDeletion);
        schemas.deleteTagSchema(schemaNameForDeletion);
    });

    it("tag schema document view", () => {
        home.login("StandardRegistry");
        schemas.openSchemasTab();
        schemas.createTagSchema(schemaNameForDocument);
        schemas.documentView();
    });
});
