import { SchemaPage } from "../../pages/schemaPage";
const schemaPage = new SchemaPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();


context("System Schema Operations", { tags: ['ui'] }, () => {

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

    it("policy schema document view", () => {
        schemaPage.documentView(schemaName);
    });

    it("delete system schema", () => {
        schemaPage.deleteSchema(schemaName);
    });

    it("activate system schema", () => {
        schemaPage.createSystemSchema(schemaName2);
        schemaPage.activateSystemSchema(schemaName2);
    });
});
