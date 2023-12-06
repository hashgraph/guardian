import ASSERT from "../../../support/CustomHelpers/assertions";
import TIMEOUTS from "../../../support/CustomHelpers/timeouts";
import URL from "../../../support/GuardianUrls";

const SchemasPageLocators = {
    //Buttons
    policySchemaTabButton: 'Policy Schemas',
    tagSchemaTabButton: 'Tag Schemas',
    systemSchemaTabButton: 'System Schemas',
    schemaCreateButton: 'Create New',
    dialogButton: 'div.g-dialog-actions-btn',
    importButton: 'Import',
    activateButton: 'div.btn-approve',
    importIPFSButton: 'Import from IPFS',
    importFileButton: 'Import from file',
    okButton: 'Ok',
    publishButton: ' Publish ',
    dialogPublishButton: 'button[id = "publish-btn"]',
    deleteSchemaButton: 'div[mattooltip="Delete"]',
    bigOkButton: 'OK',
    documentSchemaButton: 'div[mattooltip="Document"]',
    createTagButton: ' Create Tag ',
    tagDeleteButton: "div.delete-tag",
    closeWindowButton: 'div.g-dialog-cancel-btn',

    //Inputs
    schemaNameInput: "input[formcontrolname='name']",
    messageTimestampInput: "input[formcontrolname='timestamp']",
    policyChooseInput: "mat-select[role='combobox']",
    versionInput: "input[ng-reflect-placeholder='1.0.0']",
    tagNameInput: '[ng-reflect-name="name"]',
    tagDescInput: '[ng-reflect-name="description"]',
    entityChoosing: 'mat-select[formcontrolname="entity"]',


    //Requests
    getTagSchemasList: '/api/v1/tags/schemas?pageIndex=0&pageSize=25',
    getSchemasList: '/api/v1/schemas?pageIndex=0&pageSize=25',
    getTaskInfo: '/api/v1/tasks/*',
    tagsListRequest: "/api/v1/tags/",
    tagsDeleteRequest: "/api/v1/tags/*",
    tagSchemasList: '/api/v1/tags/schemas?pageIndex=0&pageSize=100',
    systemSchemasList: '/api/v1/schemas/system/StandardRegistry?pageIndex=0&pageSize=25',

    //Other elements
    policyComboboxItem: "span.mat-option-text",
    dialogContainer: "mat-dialog-container",
    schemaName: "Energy Sources",
    documentHeader: "div.g-dialog-title",
    documentContent: "div.g-dialog-body",
    activeStatus: "Active",
    userEntity: 'mat-option[value="USER"]',
    dialogActions: 'mat-dialog-actions',
};

export class SchemasPage {
    openSchemasTab() {
        cy.visit(URL.Root + URL.Schemas);
    }

    createPolicySchema(schemaName) {
        cy.contains(SchemasPageLocators.policySchemaTabButton).click();
        cy.contains(SchemasPageLocators.schemaCreateButton).click();
        cy.get(SchemasPageLocators.schemaNameInput).type(schemaName);
        cy.intercept(SchemasPageLocators.getSchemasList).as(
            "waitForSchemaList"
        );
        cy.get(SchemasPageLocators.dialogButton).click();
        cy.wait("@waitForSchemaList", { timeout: 10000 });
        cy.contains(schemaName).should("exist");
    }

    importPolicySchemaIPFS(schemaMessageId) {
        cy.contains(SchemasPageLocators.policySchemaTabButton).click();
        cy.contains(SchemasPageLocators.importButton).click();
        cy.contains(SchemasPageLocators.importIPFSButton).click();
        cy.get(SchemasPageLocators.messageTimestampInput).type(schemaMessageId);
        cy.intercept(SchemasPageLocators.getTaskInfo).as(
            "waitForPreviewMessage"
        );
        cy.contains(SchemasPageLocators.okButton).click();
        cy.wait("@waitForPreviewMessage", { timeout: 10000 });
        cy.wait(500);
        cy.get(SchemasPageLocators.dialogContainer).find(SchemasPageLocators.policyChooseInput).click();
        cy.get(SchemasPageLocators.policyComboboxItem).first().click();
        cy.intercept(SchemasPageLocators.getSchemasList).as(
            "waitForSchemaList"
        );
        cy.get(SchemasPageLocators.dialogButton).click();
        cy.wait("@waitForSchemaList", { timeout: 100000 });
        cy.contains(SchemasPageLocators.schemaName).should("exist");
    }

    importSchemaFile(schemaFileName) {
        cy.contains(SchemasPageLocators.importButton).click();
        cy.contains(SchemasPageLocators.importFileButton).click();
        cy.get('input[type=file]').selectFile('cypress/fixtures/' + schemaFileName, {force: true});
        cy.wait(500);
        cy.get(SchemasPageLocators.dialogContainer).find(SchemasPageLocators.policyChooseInput).first().click();
        cy.get(SchemasPageLocators.policyComboboxItem).first().click();
        cy.intercept(SchemasPageLocators.getSchemasList).as(
            "waitForSchemaList"
        );
        cy.get(SchemasPageLocators.dialogButton).click();
        cy.wait("@waitForSchemaList", { timeout: 100000 });
        cy.contains("SchemasPageLocators.schemaName").should("exist");
    }

    publishPolicySchema() {
        cy.contains(SchemasPageLocators.publishButton).first().click();
        cy.get(SchemasPageLocators.versionInput).type("1.6.66");
        cy.intercept(SchemasPageLocators.getSchemasList).as(
            "waitForSchemaList"
        );
        cy.get(SchemasPageLocators.dialogPublishButton).click();
        cy.wait("@waitForSchemaList", { timeout: 100000 });
        cy.contains(SchemasPageLocators.schemaName).first().parent()
            .contains("Published").should("exist");
    }

    deletePolicySchema(schemaNameForDeletion) {
        cy.contains(schemaNameForDeletion).parent().find(SchemasPageLocators.deleteSchemaButton).click();
        cy.intercept(SchemasPageLocators.getSchemasList).as(
            "waitForSchemaList"
        );
        cy.contains(SchemasPageLocators.bigOkButton).click();
        cy.wait("@waitForSchemaList", { timeout: 100000 });
        cy.contains(schemaNameForDeletion).should("not.exist");
    }

    documentView() {
        cy.get(SchemasPageLocators.documentSchemaButton).first().click();
        cy.get(SchemasPageLocators.documentHeader).should("have.text", " Schema ");
        cy.get(SchemasPageLocators.documentContent).should("exist");
    }

    addTag(tagName) {
        cy.contains(SchemasPageLocators.createTagButton).click();
        cy.get(SchemasPageLocators.tagNameInput).type(tagName);
        cy.get(SchemasPageLocators.tagDescInput).type(tagName);
        cy.intercept(SchemasPageLocators.tagsListRequest).as(
            "waitForTags"
        );
        cy.get(SchemasPageLocators.dialogButton).click();
        cy.wait("@waitForTags", { timeout: 30000 });
        cy.contains(tagName).should("exist");
    }

    deleteTag(tagName) {
        cy.contains(tagName).click();
        cy.intercept(SchemasPageLocators.tagsDeleteRequest).as(
            "waitForTags"
        );
        cy.get(SchemasPageLocators.tagDeleteButton).click();
        cy.wait("@waitForTags", { timeout: 30000 })
        cy.get(SchemasPageLocators.closeWindowButton).click();
        cy.contains(tagName).should("not.exist");
    }

    createTagSchema(schemaName) {
        cy.intercept(SchemasPageLocators.getTagSchemasList).as(
            "waitForSchemaList"
        );
        cy.contains('mat-label', 'Type').parent().parent().parent().click()
        cy.contains(SchemasPageLocators.tagSchemaTabButton).click();
        cy.contains(SchemasPageLocators.schemaCreateButton).click();
        cy.get(SchemasPageLocators.schemaNameInput).click().type(schemaName);
        cy.get(SchemasPageLocators.dialogButton).click();
        cy.wait("@waitForSchemaList", { timeout: 10000 });
        cy.contains(schemaName).should("exist");
    }

    publishTagSchema(schemaName) {
        cy.intercept(SchemasPageLocators.tagSchemasList).as(
            "waitForSchemaList"
        );
        cy.contains(SchemasPageLocators.publishButton.trim()).first().click();
        cy.wait(10000)
        cy.wait("@waitForSchemaList", { timeout: 100000 });
        cy.contains(schemaName).should("be.visible").first().parent()
            .contains("Published").should("exist");
    }

    deleteTagSchema(schemaNameForDeletion) {
        cy.contains(schemaNameForDeletion).parent().find(SchemasPageLocators.deleteSchemaButton).click();
        cy.intercept(SchemasPageLocators.tagSchemasList).as(
            "waitForSchemaList"
        );
        cy.contains(SchemasPageLocators.bigOkButton).click();
        cy.wait(10000)
        cy.wait("@waitForSchemaList", { timeout: 100000 });
        cy.contains(schemaNameForDeletion).should("not.exist");
    }

    createSystemSchema(schemaName) {
        cy.intercept(SchemasPageLocators.systemSchemasList).as(
            "waitForSchemaList"
        );
        cy.contains('mat-label', 'Type').parent().parent().parent().click()
        cy.contains(SchemasPageLocators.systemSchemaTabButton).click();
        cy.contains(SchemasPageLocators.schemaCreateButton).click();
        cy.get(SchemasPageLocators.schemaNameInput).click().type(schemaName);
        cy.get(SchemasPageLocators.entityChoosing).click();
        cy.get(SchemasPageLocators.userEntity).click();
        cy.get(SchemasPageLocators.dialogButton).click();
        cy.wait("@waitForSchemaList", { timeout: 10000 });
        cy.contains(schemaName).should("exist");
    }

    activateSystemSchema(schemaNameForActivate) {
        cy.contains(SchemasPageLocators.systemSchemaTabButton).click();
        cy.contains(schemaNameForActivate).parent().find(SchemasPageLocators.activateButton).click();
        cy.contains(schemaNameForActivate).parent().contains(SchemasPageLocators.activeStatus).should("exist");
    }

    activateOtherSystemSchema(schemaNameForActivate) {
        cy.intercept(SchemasPageLocators.systemSchemasList).as(
            "waitForSchemaList"
        );
        cy.contains(SchemasPageLocators.systemSchemaTabButton).click();
        cy.wait("@waitForSchemaList", { timeout: 10000 });
        cy.get(SchemasPageLocators.activateButton).first().click();
        cy.contains(schemaNameForActivate).parent().contains(SchemasPageLocators.activeStatus).should("not.exist");
    }

    deleteSystemSchema(schemaNameForDeletion) {
        cy.contains(schemaNameForDeletion).parent().find(SchemasPageLocators.deleteSchemaButton).click();
        cy.intercept(SchemasPageLocators.systemSchemasList).as(
            "waitForSchemaList"
        );
        cy.get(SchemasPageLocators.dialogActions).contains(SchemasPageLocators.bigOkButton).click();
        cy.wait("@waitForSchemaList", { timeout: 10000 });
        cy.contains(schemaNameForDeletion).should("not.exist");
    }
}
