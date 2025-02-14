import { SchemaPage } from "../../pages/schemaPage";
const schemaPage = new SchemaPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();
    
context("Policy Schema Creation", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const schemaName = "UIPolicySchema";
    const schemaMessageId = "1707910154.293808812";
    const schemaNameImportedIPFS = "Applicant Details";
    const schemaFileName = "exportedSchema.schema";
    const schemaNameImportedFile = "Lead User Details";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        schemaPage.openSchemasTab();
        schemaPage.openSchemasSubtab("Policy");
    })

    it("create policy schema", () => {
        schemaPage.createPolicySchema(schemaName);
    });

    it("import policy schema IPFS", () => {
        schemaPage.importPolicySchemaIPFS(schemaMessageId, schemaNameImportedIPFS);
    });

    it("import policy schema file", () => {
        schemaPage.importSchemaFile(schemaFileName, schemaNameImportedFile);
    });
});
