import { SchemaPage } from "../../pages/schemaPage";
const schemaPage = new SchemaPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Policy Schema Tags", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const schemaNameImportedIPFS = "Applicant Details";
    const tagName = "tagTestName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        schemaPage.openSchemasTab();
        schemaPage.openSchemasSubtab("Policy");
    })

    it("create tag for policy schema", () => {
        schemaPage.addTag(schemaNameImportedIPFS, tagName);
    });

    it("delete tag", () => {
        schemaPage.deleteTag(schemaNameImportedIPFS, tagName);
    });
});
