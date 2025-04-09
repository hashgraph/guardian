import { SchemaPage } from "../../pages/schemaPage";
const schemaPage = new SchemaPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Tag Schema Operations", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const schemaName = "UITagSchema";
    const schemaName2 = "UITagSchema2";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        schemaPage.openSchemasTab();
        schemaPage.openSchemasSubtab("Tag");
    })

    it("tag schema document view", () => {
        schemaPage.documentView(schemaName);
    });

    it("delete tag schema", () => {
        schemaPage.deleteSchema(schemaName);
    });

    it("publish tag schema", () => {
        schemaPage.createSchema(schemaName2);
        schemaPage.publishTagSchema(schemaName2);
    });
});
