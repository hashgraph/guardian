import { SchemaPage } from "../../pages/schemaPage";
const schemaPage = new SchemaPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Policy Schema Operations", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const schemaName = "UIPolicySchema";
    const schemaNameImportedIPFS = "Applicant Details";
    const schemaNameImportedFile = "Lead User Details";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        schemaPage.openSchemasTab();
        schemaPage.openSchemasSubtab("Policy");
    })

    it("policy schema document view", () => {
        schemaPage.filterByLastPolicy();
        schemaPage.documentView(schemaNameImportedFile);
    });

    it("delete policy schema", () => {
        schemaPage.deleteSchema(schemaName);
    });

    it("publish policy schema", () => {
        schemaPage.publishPolicySchema(schemaNameImportedIPFS);
    });

    it("publish policy schema", () => {
        schemaPage.publishPolicySchema(schemaNameImportedFile);
    });

    it("Export by File", () => {
        schemaPage.exportSchemaFile(schemaNameImportedFile);
    });

    it("Export by IPFS", () => {
        schemaPage.exportSchemaIPFS(schemaNameImportedIPFS);
    });

    // TODO: 5039 Schemas compare fix
    // it("Compare Policy Schema", () => {
    //     schemaPage.comparePolicySchema(schemaNameImportedIPFS, schemaNameImportedFile);
    // });

    it("Edit Policy schema", () => {
        schemaPage.editPolicySchema(schemaNameImportedFile);
    });
});
