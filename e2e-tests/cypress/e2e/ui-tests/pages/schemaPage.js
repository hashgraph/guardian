import URL from '../../../support/GuardianUrls';
import * as Checks from '../../../support/checkingMethods';
import CommonElements from '../../../support/defaultUIElements';
import { dropFile } from '../../../support/importFlow';
import { addTag, deleteTag } from '../../../support/tagsExplorer';

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
    documentHeader: 'div.header-text',
    documentContent: 'div.dialog-body',
    filterDropdown: "p-dropdown[placeholder='Policy']",
    filterDropdownComparePolicy: "p-dropdown[placeholder='Select Policy']",
    filterDropdownCompareSchema: "p-dropdown[placeholder='Select Schema']",
    entityList: '[formcontrolname="entity"]',
    entityOption: (entityType) => `li[aria-label=${entityType}]`,
    compareSchemaName: 'div.schema-info-field-value',
    activeStatus: 'Active',

    policyChooseInput: "mat-select[role='combobox']",
    entityChoosing: 'mat-select[formcontrolname="entity"]',

    policyComboboxItem: 'span.mat-option-text',
    dialogContainer: 'mat-dialog-container',
    userEntity: 'mat-option[value="USER"]',
    dialogActions: 'mat-dialog-actions',
};

// The schemas list (tree table grouped by policy, newest first) and the full-page schema editor.
const List = {
    row: 'tr.guardian-grid-row',
    nameCell: 'td .text-truncate',
    searchInput: 'input[placeholder="Search"]',
    toolbarButton: (tooltip) => `span[ptooltip="${tooltip}"] p-button`,
    publishButton: 'div.btn-approve:contains("Publish")',
    editIcon: 'div[ptooltip="Edit"]',
    menuIcon: 'div[ptooltip="Menu"]',
    menuButton: '.menu-container p-button',
    dialog: 'div.p-dialog',
    deleteConfirm: 'button.guardian-button-delete',
    versionInput: 'input#version',
    ipfsInput: 'input#timestamp',
    policyDropdown: 'p-select#policyDropdown',
    option: 'li[role="option"]',
    exportFileButton: 'button:contains("Save to file")',
    exportMessageIdButton: 'button:contains("Copy message identifier")',
};

const Editor = {
    newSchemaNameInput: 'input.sc-rp-input[placeholder="e.g. Monitoring Report"]',
    schemaNameInput: 'input.sc-schema-props-name',
    fieldDescriptionInput: 'input[placeholder="Field description"]',
    sidebarTab: 'button.sc-sidebar-tab',
};

const nameCellMatches = (name) => (_, row) => row.querySelector(List.nameCell)?.textContent.trim() === name;

export class SchemaPage {

    openSchemasTab() {
        cy.visit(URL.Root + URL.Schemas);
        Checks.waitForLoading();
        // The list is loaded once either its rows or the empty-state message are rendered.
        cy.get(`${List.row}, div.guardian-user-not-data`, { timeout: 30000 }).should('exist');
    }

    openSchemasSubtab(name) {
        cy.contains('p-tab', `${name} Schemas`).then(($tab) => {
            if ($tab.attr('data-p-active') !== 'true') {
                cy.wrap($tab).click();
            }
        });
        Checks.waitForLoading();
    }

    // The list is searched server-side by name, so a schema is found whatever page or policy group it is in.
    _row(name) {
        cy.get(List.searchInput).clear();
        cy.get(List.searchInput).type(`${name}{enter}`);
        Checks.waitForLoading();
        return cy.get(List.row, { timeout: 30000 }).filter(nameCellMatches(name));
    }

    // Creates a draft policy schema with one field (an empty schema cannot be saved) in the editor.
    createSchema(schemaName) {
        cy.get(List.toolbarButton('Create a Schema')).click();
        cy.location('pathname', { timeout: 15000 }).should('include', 'schema-configuration');
        cy.get(Editor.newSchemaNameInput, { timeout: 15000 }).invoke('val', schemaName).trigger('input');
        cy.get(Editor.newSchemaNameInput).should('have.value', schemaName);
        cy.contains('button', 'Create').click();
        cy.contains(Editor.sidebarTab, 'Fields').click();
        cy.contains('String').click();
        cy.get(Editor.fieldDescriptionInput).type('A field');
        this._saveEditor();
        this.openSchemasTab();
        this._row(schemaName).should('exist');
    }

    _saveEditor() {
        cy.contains('button', 'Save all').click();
        Checks.waitForLoading();
        cy.contains('button', 'Save all').should('not.have.class', 'dirty');
    }

    // Imports the schema into the first policy offered by the preview dialog.
    _importFromPreview(schemaName) {
        cy.contains(List.dialog, 'Schema Import Preview', { timeout: 60000 }).as('preview');
        cy.get('@preview').find(List.policyDropdown).click();
        cy.get(List.option).first().click();
        cy.get('@preview').contains('button', 'Import').should('not.be.disabled').click();
        Checks.waitForTaskComplete();
        Checks.waitForLoading();
        this._row(schemaName).should('exist');
    }

    importPolicySchemaIPFS(schemaMessageId, schemaName) {
        cy.get(List.toolbarButton('Import')).click();
        cy.contains(List.dialog, 'Select action').contains('Import from IPFS').click();
        // The field re-renders as soon as the typed text is a valid id and drops the remaining
        // keystrokes, so the whole value is set at once.
        cy.get(List.ipfsInput).invoke('val', schemaMessageId).trigger('input');
        cy.get(List.ipfsInput).should('have.value', schemaMessageId);
        cy.contains(List.dialog, 'Select action').contains('button', 'Import').click();
        this._importFromPreview(schemaName);
    }

    importSchemaFile(schemaFileName, schemaName) {
        cy.get(List.toolbarButton('Import')).click();
        cy.contains(List.dialog, 'Select action').contains('Import from File').click();
        dropFile(schemaFileName);
        this._importFromPreview(schemaName);
    }

    publishPolicySchema(name, version = '1.0.0') {
        this._row(name).find(List.publishButton).click();
        cy.get(List.versionInput, { timeout: 15000 }).invoke('val', version).trigger('input');
        cy.get(List.versionInput).should('have.value', version);
        cy.get(List.dialog).contains('button', 'Ok').click();
        Checks.waitForTaskComplete();
        Checks.waitForLoading();
        this._row(name).should('contain.text', 'Published');
    }

    _openMenu(name) {
        this._row(name).find(List.menuIcon).click();
        cy.get(List.menuButton, { timeout: 15000 }).should('be.visible');
    }

    // Only drafts can be deleted, and the same schema name can exist under several policies.
    deleteSchema(name) {
        this._row(name).filter(':contains("Draft")').first().find(List.menuIcon).click();
        cy.get(List.menuButton, { timeout: 15000 }).should('be.visible');
        cy.contains(List.menuButton, 'Delete schema').click();
        cy.get(List.deleteConfirm, { timeout: 15000 }).click();
        Checks.waitForLoading();
        cy.get('body').should(($body) => {
            expect($body.find(List.row).filter(nameCellMatches(name)).filter(':contains("Draft")').length).to.eq(0);
        });
    }

    documentView(name) {
        this._openMenu(name);
        cy.contains(List.menuButton, /^\s*Schema\s*$/).click();
        cy.contains(List.dialog, 'Schema').should('exist');
    }

    editPolicySchema(name, newName) {
        this._row(name).find(List.editIcon).click();
        cy.location('pathname', { timeout: 15000 }).should('include', 'schema-configuration');
        cy.get(Editor.schemaNameInput, { timeout: 15000 }).invoke('val', newName).trigger('input');
        cy.get(Editor.schemaNameInput).should('have.value', newName);
        this._saveEditor();
        this.openSchemasTab();
        this._row(newName).should('exist');
    }

    exportSchemaFile(name) {
        this._openMenu(name);
        cy.contains(List.menuButton, 'Export schema').click();
        cy.get(List.dialog).find(List.exportFileButton).click();
        cy.verifyDownload('.schema', { contains: true });
    }

    exportSchemaIPFS(name) {
        this._openMenu(name);
        cy.contains(List.menuButton, 'Export schema').click();
        cy.get(List.dialog).find(List.exportMessageIdButton).realClick();
        cy.window().then((win) => {
            win.navigator.clipboard.readText().then((text) => {
                //regex numbers.numbers
                expect(text).to.match(/\d+\.\d+/g);
            });
        });
    }

    addTag(name, tagName) {
        addTag(() => this._row(name), tagName);
    }

    deleteTag(name, tagName) {
        deleteTag(() => this._row(name), tagName);
    }

    createSystemSchema(){
        cy.get(SchemaPageLocators.schemaCreateButton).click();
        cy.get(SchemaPageLocators.schemaNameInput).type(schemaName);
        cy.get(SchemaPageLocators.systemSchemaEntity).click();
        cy.get(CommonElements.dropdownOption).first().click();
        cy.get(SchemaPageLocators.dialogSaveButton).click();
        Checks.waitForTaskComplete();
        cy.contains(schemaName).should('exist');}

    activateSystemSchema(schemaNameForActivate) {
        cy.contains(schemaNameForActivate).parent().find(SchemaPageLocators.activateButton).click();
        cy.contains(schemaNameForActivate).parent().contains(SchemaPageLocators.activeStatus).should('exist');
    }

    publishTagSchema(name) {
        cy.contains(name).parent().find(SchemaPageLocators.publishButton).first().click();
        Checks.waitForLoading();
        cy.contains(name).first().parent().contains('Published').should('exist');
    }

    createTagSchema(schemaName) {
        cy.intercept(SchemaPageLocators.getTagSchemasList).as(
            'waitForSchemaList'
        );
        cy.contains('mat-label', 'Type').parent().parent().parent().click()
        cy.contains(SchemaPageLocators.tagSchemaTabButton).click();
        cy.get(SchemaPageLocators.schemaCreateButton).click();
        cy.get(SchemaPageLocators.schemaNameInput).click().type(schemaName);
        cy.get(SchemaPageLocators.dialogSaveButton).click();
        cy.wait('@waitForSchemaList', { timeout: 10000 });
        cy.contains(schemaName).should('exist');
    }

    publishTagSchemaOld(schemaName) {
        cy.intercept(SchemaPageLocators.tagSchemasList).as(
            'waitForSchemaList'
        );
        cy.get(SchemaPageLocators.publishButton.trim()).first().click();
        cy.wait(10000)
        cy.wait('@waitForSchemaList', { timeout: 100000 });
        cy.contains(schemaName).should('be.visible').first().parent()
            .contains('Published').should('exist');
    }

    deleteTagSchema(schemaNameForDeletion) {
        cy.contains(schemaNameForDeletion).parent().find(SchemaPageLocators.deleteSchemaButton).click();
        cy.intercept(SchemaPageLocators.tagSchemasList).as(
            'waitForSchemaList'
        );
        cy.contains(SchemaPageLocators.bigOkButton).click();
        cy.wait(10000)
        cy.wait('@waitForSchemaList', { timeout: 100000 });
        cy.contains(schemaNameForDeletion).should('not.exist');
    }

    activateOtherSystemSchema(schemaNameForActivate) {
        cy.intercept(SchemaPageLocators.systemSchemasList).as(
            'waitForSchemaList'
        );
        cy.contains(SchemaPageLocators.systemSchemaTabButton).click();
        cy.wait('@waitForSchemaList', { timeout: 10000 });
        cy.get(SchemaPageLocators.activateButton).first().click();
        cy.contains(schemaNameForActivate).parent().contains(SchemaPageLocators.activeStatus).should('not.exist');
    }

    deleteSystemSchema(schemaNameForDeletion) {
        cy.contains(schemaNameForDeletion).parent().find(SchemaPageLocators.deleteSchemaButton).click();
        cy.intercept(SchemaPageLocators.systemSchemasList).as(
            'waitForSchemaList'
        );
        cy.get(SchemaPageLocators.dialogActions).contains(SchemaPageLocators.bigOkButton).click();
        cy.wait('@waitForSchemaList', { timeout: 10000 });
        cy.contains(schemaNameForDeletion).should('not.exist');
    }
}
