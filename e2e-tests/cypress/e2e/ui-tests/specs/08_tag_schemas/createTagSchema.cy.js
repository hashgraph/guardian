import { SchemaPage } from "../../pages/schemaPage";
const schemaPage = new SchemaPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Tag Schema Creation", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const schemaName = "UITagSchema3";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        schemaPage.openSchemasTab();
        schemaPage.openSchemasSubtab("Tag");
    })

    it("create tag schema", () => {
        schemaPage.createSchema(schemaName);
    });
});
