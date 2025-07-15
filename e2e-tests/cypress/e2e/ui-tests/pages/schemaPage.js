import * as Checks from "../../../support/checkingMethods";
import CommonElements from "../../../support/defaultUIElements";

const SchemaPageLocators = {

    schemaSubtub: (name) => `${name} Schemas`,

    //Buttons
    schemaCreateButton: 'p-button[ng-reflect-content="Create a Schema"]',
    dialogSaveButton: 'button:contains("Save")',
    importIPFSButton: ' Import from IPFS ',
    importFileButton: ' Import from File ',
    exportFileButton: 'Save to file',
    exportIPFSButton: 'Copy message identifier',
    schemaImportButton: 'p-button[ng-reflect-content="Import"]',
    schemaFinalImportButton: '[ng-reflect-label="Import"]',
    pImportButton: 'p-button[label="Import"]',
    oneMoreImportButton: "button:contains('Import')",
    publishButton: 'div:contains("Publish ")',
    deleteSchemaButton: 'button.accent-color-red',
    menuSchemaButton: 'div[ptooltip="Menu"]',
    dialogPublishButton: 'button[ng-reflect-label="Ok"]',
    confirmDeleteButton: 'button.guardian-button-delete',
    documentSchemaButton: 'p-button[ng-reflect-content="View schema details"]',
    schemaEditBtn: "div[ptooltip='Edit']",
    saveBtn: 'button[ng-reflect-label="Save"]',
    schemaExportBtn: 'p-button[ng-reflect-content="Export schema"]',
    compareBtn: 'p-button[ng-reflect-content="Compare"]',
    compareFinalBtn: 'button[ng-reflect-label="Compare"]',
    deleteTagIcon: "svg-icon[svgclass='accent-color-red']",
    closeWindowButton: "[ng-reflect-label='Close']",
    createButton: "[ng-reflect-label='Create']",
    createTagButton: ' Create a Tag ',
    activateButton: 'div.btn-approve',
    systemSchemaEntity: 'p-dropdown[formcontrolname="entity"]',

    //Inputs
    schemaNameInput: "input[formcontrolname='name']",
    messageTimestampInput: "input[formcontrolname='timestamp']",
    versionInput: "input[id='version']",
    tagNameInput: '[ng-reflect-name="name"]',
    tagDescInput: '[ng-reflect-name="description"]',

    //Other elements
    documentHeader: "div.header-text",
    documentContent: "div.dialog-body",
    filterDropdown: "p-dropdown[placeholder='Policy']",
    filterDropdownComparePolicy: "p-dropdown[placeholder='Select Policy']",
    filterDropdownCompareSchema: "p-dropdown[placeholder='Select Schema']",
    entityList: '[formcontrolname="entity"]',
    entityOption: (entityType) => `li[aria-label=${entityType}]`,
    compareSchemaName: 'div.schema-info-field-value',
    activeStatus: "Active",





    policyChooseInput: "mat-select[role='combobox']",
    entityChoosing: 'mat-select[formcontrolname="entity"]',


    policyComboboxItem: "span.mat-option-text",
    dialogContainer: "mat-dialog-container",
    userEntity: 'mat-option[value="USER"]',
    dialogActions: 'mat-dialog-actions',
};

export class SchemaPage {

    openSchemasTab() {
        cy.get(CommonElements.navBar).should('exist')
        cy.get("body").then(($body) => {
            if ($body.find(`span:contains(${CommonElements.schemasTab})`).length == 0)
                cy.get(CommonElements.navBar).contains(CommonElements.mainPoliciesTab).click();
        })
        cy.get(CommonElements.navBar).contains(CommonElements.schemasTab).click();
        Checks.waitForLoading();
    }

    openSchemasSubtab(name) {
        cy.contains(SchemaPageLocators.schemaSubtub(name)).then(($tab) => {
            if ($tab.get(0).getAttribute('aria-selected') == "false")
                cy.wrap($tab).click();
        })
        Checks.waitForLoading();
    }

    createSchema(schemaName) {
        cy.get(SchemaPageLocators.schemaCreateButton).click();
        cy.get(SchemaPageLocators.schemaNameInput).type(schemaName);
        cy.get(SchemaPageLocators.dialogSaveButton).click();
        Checks.waitForTaskComplete();
        cy.contains(schemaName).should("exist");
    }

    createSystemSchema(){
        cy.get(SchemaPageLocators.schemaCreateButton).click();
        cy.get(SchemaPageLocators.schemaNameInput).type(schemaName);
        cy.get(SchemaPageLocators.systemSchemaEntity).click();
        cy.get(CommonElements.dropdownOption).first().click();
        cy.get(SchemaPageLocators.dialogSaveButton).click();
        Checks.waitForTaskComplete();
        cy.contains(schemaName).should("exist");}

    importPolicySchemaIPFS(schemaMessageId, schemaName) {
        cy.get(SchemaPageLocators.schemaImportButton).click();
        cy.contains(SchemaPageLocators.importIPFSButton).click();
        cy.get(SchemaPageLocators.messageTimestampInput).type(schemaMessageId);
        cy.get(SchemaPageLocators.schemaFinalImportButton).click();
        Checks.waitForElement("div:contains('Description')");
        cy.get(CommonElements.dialogWindow).last().find(CommonElements.dropdown).click();
        cy.get(CommonElements.dropdownOption).eq(1).click();
        cy.get(SchemaPageLocators.oneMoreImportButton).click();
        Checks.waitForTaskComplete();
        cy.contains(schemaName).should("exist");
    }

    importSchemaFile(schemaFileName, schemaName) {
        cy.get(SchemaPageLocators.schemaImportButton).click();
        cy.contains(SchemaPageLocators.importFileButton).click();
        cy.get('input[type=file]').selectFile('cypress/fixtures/' + schemaFileName, { force: true });
        Checks.waitForElement("div:contains('Description')");
        cy.get(CommonElements.dialogWindow).find(CommonElements.dropdown).click();
        cy.get(CommonElements.dropdownOption).eq(1).click();
        cy.get(SchemaPageLocators.oneMoreImportButton).click();
        Checks.waitForTaskComplete();
        cy.contains(schemaName).should("exist");
    }

    publishPolicySchema(name) {
        cy.contains(name).parent().find(SchemaPageLocators.publishButton).first().click();
        cy.get(SchemaPageLocators.versionInput).type("0.8.4");
        cy.get(SchemaPageLocators.dialogPublishButton).click();
        Checks.waitForTaskComplete();
        cy.contains(name).first().parent().contains("Published").should("exist");
    }

    deleteSchema(name) {
        cy.contains(name).parent().find(SchemaPageLocators.menuSchemaButton).click();
        cy.get(SchemaPageLocators.deleteSchemaButton).click();
        cy.get(SchemaPageLocators.confirmDeleteButton).click();
        Checks.waitForLoading();
        cy.contains(name).should("not.exist");
    }

    documentView(name) {
        cy.contains(name).parent().find(SchemaPageLocators.menuSchemaButton).click();
        cy.get(SchemaPageLocators.documentSchemaButton).click();
        cy.get(SchemaPageLocators.documentHeader).should("have.text", "Schema");
        cy.get(SchemaPageLocators.documentContent).should("exist");
    }

    filterByLastPolicy() {
        cy.get(SchemaPageLocators.filterDropdown).click();
        cy.get(CommonElements.dropdownOption).eq(1).click();
        Checks.waitForLoading();
    }

    editPolicySchema(name) {
        cy.contains(name).parent().find(SchemaPageLocators.schemaEditBtn).click();
        Checks.waitForLoading();
        cy.get(SchemaPageLocators.schemaNameInput).clear().type(name + " updated");
        cy.get(SchemaPageLocators.dialogSaveButton).click({ force: true });
        Checks.waitForLoading();
        cy.contains(name + " updated").should('exist');
    }

    exportSchemaFile(name) {
        cy.contains(name).parent().find(SchemaPageLocators.menuSchemaButton).click();
        cy.get(SchemaPageLocators.schemaExportBtn).click();
        cy.contains(SchemaPageLocators.exportFileButton).click();
        cy.verifyDownload('.schema', { contains: true });
    }

    exportSchemaIPFS(name) {
        cy.contains(name).parent().find(SchemaPageLocators.menuSchemaButton).click();
        cy.get(SchemaPageLocators.schemaExportBtn).click();
        cy.contains(SchemaPageLocators.exportIPFSButton).realClick();
        cy.window().then((win) => {
            win.navigator.clipboard.readText().then((text) => {
                //regex numbers.numbers
                expect(text).to.match(/\d+\.\d+/g);
            });
        });
    }

    comparePolicySchema(schemaPolicy1, schemaPolicy2) {
        cy.get(SchemaPageLocators.compareBtn).click();
        cy.get(SchemaPageLocators.filterDropdownComparePolicy).first().click();
        cy.get(CommonElements.dropdownOption).eq(1).click();
        cy.get(SchemaPageLocators.filterDropdownComparePolicy).last().click();
        cy.get(CommonElements.dropdownOption).eq(1).click();
        cy.get(SchemaPageLocators.filterDropdownCompareSchema).first().click();
        cy.get(CommonElements.dropdownOption).eq(0).click();
        cy.get(SchemaPageLocators.filterDropdownCompareSchema).last().click();
        cy.get(CommonElements.dropdownOption).eq(0).click();
        cy.screenshot();
        cy.get(SchemaPageLocators.compareFinalBtn).click();
        Checks.waitForLoading();
        cy.contains(SchemaPageLocators.compareSchemaName, schemaPolicy1).should('exist');
        cy.contains(SchemaPageLocators.compareSchemaName, schemaPolicy2).should('exist');
    }

    addTag(name, tagName) {
        cy.contains(name).siblings().contains(SchemaPageLocators.createTagButton).click();
        cy.get(SchemaPageLocators.tagNameInput).type(tagName);
        cy.get(SchemaPageLocators.tagDescInput).type(tagName);
        cy.get(SchemaPageLocators.createButton).click();
        cy.contains(tagName).should("exist");
    }

    deleteTag(name, tagName) {
        cy.contains(name).siblings().contains(tagName).click();
        cy.get(SchemaPageLocators.deleteTagIcon).click();
        cy.get(SchemaPageLocators.closeWindowButton).click();
        cy.contains(tagName).should("not.exist");
    }

    activateSystemSchema(schemaNameForActivate) {
        cy.contains(schemaNameForActivate).parent().find(SchemaPageLocators.activateButton).click();
        cy.contains(schemaNameForActivate).parent().contains(SchemaPageLocators.activeStatus).should("exist");
    }

    publishTagSchema(name) {
        cy.contains(name).parent().find(SchemaPageLocators.publishButton).first().click();
        Checks.waitForLoading();
        cy.contains(name).first().parent().contains("Published").should("exist");
    }









    createTagSchema(schemaName) {
        cy.intercept(SchemaPageLocators.getTagSchemasList).as(
            "waitForSchemaList"
        );
        cy.contains('mat-label', 'Type').parent().parent().parent().click()
        cy.contains(SchemaPageLocators.tagSchemaTabButton).click();
        cy.get(SchemaPageLocators.schemaCreateButton).click();
        cy.get(SchemaPageLocators.schemaNameInput).click().type(schemaName);
        cy.get(SchemaPageLocators.dialogSaveButton).click();
        cy.wait("@waitForSchemaList", { timeout: 10000 });
        cy.contains(schemaName).should("exist");
    }

    publishTagSchemaOld(schemaName) {
        cy.intercept(SchemaPageLocators.tagSchemasList).as(
            "waitForSchemaList"
        );
        cy.get(SchemaPageLocators.publishButton.trim()).first().click();
        cy.wait(10000)
        cy.wait("@waitForSchemaList", { timeout: 100000 });
        cy.contains(schemaName).should("be.visible").first().parent()
            .contains("Published").should("exist");
    }

    deleteTagSchema(schemaNameForDeletion) {
        cy.contains(schemaNameForDeletion).parent().find(SchemaPageLocators.deleteSchemaButton).click();
        cy.intercept(SchemaPageLocators.tagSchemasList).as(
            "waitForSchemaList"
        );
        cy.contains(SchemaPageLocators.bigOkButton).click();
        cy.wait(10000)
        cy.wait("@waitForSchemaList", { timeout: 100000 });
        cy.contains(schemaNameForDeletion).should("not.exist");
    }

    activateOtherSystemSchema(schemaNameForActivate) {
        cy.intercept(SchemaPageLocators.systemSchemasList).as(
            "waitForSchemaList"
        );
        cy.contains(SchemaPageLocators.systemSchemaTabButton).click();
        cy.wait("@waitForSchemaList", { timeout: 10000 });
        cy.get(SchemaPageLocators.activateButton).first().click();
        cy.contains(schemaNameForActivate).parent().contains(SchemaPageLocators.activeStatus).should("not.exist");
    }

    deleteSystemSchema(schemaNameForDeletion) {
        cy.contains(schemaNameForDeletion).parent().find(SchemaPageLocators.deleteSchemaButton).click();
        cy.intercept(SchemaPageLocators.systemSchemasList).as(
            "waitForSchemaList"
        );
        cy.get(SchemaPageLocators.dialogActions).contains(SchemaPageLocators.bigOkButton).click();
        cy.wait("@waitForSchemaList", { timeout: 10000 });
        cy.contains(schemaNameForDeletion).should("not.exist");
    }
}
