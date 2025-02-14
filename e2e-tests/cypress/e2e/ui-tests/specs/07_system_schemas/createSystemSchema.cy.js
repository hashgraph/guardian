import { SchemaPage } from "../../pages/schemaPage";
const schemaPage = new SchemaPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();


context("System Schema Creation", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const schemaName = "UISystemSchema";
    const schemaName2 = "UISystemSchema2";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        schemaPage.openSchemasTab();
        schemaPage.openSchemasSubtab("System");
    });

    it("create system schema", () => {
        schemaPage.createSchema(schemaName);
    });

    it("create system schema", () => {
        schemaPage.createSchema(schemaName);
    });
});