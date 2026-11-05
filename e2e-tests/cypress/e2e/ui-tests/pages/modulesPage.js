import URL from '../../../support/GuardianUrls';
import * as Checks from '../../../support/checkingMethods';
import CommonElements from '../../../support/defaultUIElements';
import { dropFile } from '../../../support/importFlow';
import { addTag, deleteTag } from '../../../support/tagsExplorer';

// The modules list (PrimeNG table, newest modules first, so a module created by a run is on page 1).
const List = {
    row: 'tr.guardian-grid-row',
    nameCell: 'td .text-truncate',
    statusCell: 'td:nth-child(4)',
    headerCell: 'tr.guardian-grid-header th',
    publishButton: 'button:contains("Publish")',
    exportIcon: 'svg-icon[src*="export.svg"]',
    editIcon: 'svg-icon[src*="edit.svg"]',
    deleteIcon: 'svg-icon[src*="delete.svg"]',
    toolbarButton: 'p-button.toolbar-btn-primary',
    // The new-module dialog is a custom PrimeNG dialog, the others are guardian dialogs.
    dialog: 'div.p-dialog',
    deleteConfirm: 'button.button-color-red',
    ipfsInput: 'input#timestamp',
    previewImportButton: 'div.dialog-footer button:contains("Import")',
    exportFileButton: 'button:contains("Save to file")',
    exportMessageIdButton: 'button:contains("Copy message identifier")',
    tagsExplorer: 'tags-explorer',
    tagCreateButton: 'button:contains("Create a Tag")',
};

const nameCellMatches = (name) => (_, row) => row.querySelector(List.nameCell)?.textContent.trim() === name;

// Importing an archive whose name is taken adds a `_<timestamp>` suffix to the new module.
const importedNameMatches = (name) => (_, row) => new RegExp(`^${name}(_\\d+)?$`).test(row.querySelector(List.nameCell)?.textContent.trim());

const ModulesPageLocators = {
    createNewButton: 'Create a Module',
    nameInput: '[formcontrolname="name"]',
    descriptionInput: '[formcontrolname="description"]',
    finalCreateButton: 'button[label="Create"]',
    importButton: 'Import',
    importIPFSButton: ' Import from IPFS ',
    timestampInput: '[formcontrolname="timestamp"]',
    moduleImportButton: 'button:contains("Import")',
    pImportButton: 'button[label="Import"]',
    moduleDeleteIcon: '[ng-reflect-src="/assets/images/icons/delete.sv"]',
    moduleDeleteButton: 'span:contains("Delete")',
    exportModule: '[ng-reflect-src="/assets/images/icons/export.sv"]',
    exportFileButton: ' Save to file ',
    exportMessageIdButton: ' Copy message identifier ',
    publishButton: 'Publish ',
    publishedStatus: 'Published',
    createButton: "[ng-reflect-label='Create']",
    deleteTagIcon: "svg-icon[svgclass='accent-color-red']",
    closeWindowButton: "[ng-reflect-label='Close']",
    headerSelector: 'tr.row-header th',
    moduleEditButton: '[ng-reflect-src="/assets/images/icons/edit.svg"]',
    moduleBlock: '[class="block-item"]',
    saveModuleEditing: "div.readonly-status[title='Save Module']",
    backButton: "div[title='Back']",
    componentsBlock: `span.drag-component-name`,
    blockItemName: (name) => `div.block-item-name:contains(${name})`,
    expandBlockBtn: (value) => `[block-instance="${value}"] .block-expand`,
    deleteBlockBtn: 'button[class*="delete-action"]:visible',

    okButton: 'Ok',
    modulesList: '/api/v1/modules?pageIndex=0&pageSize=10',
    postPreviewIPFS: '/api/v1/modules/import/message/preview',
    postPreviewFile: '/api/v1/modules/import/file/preview',
    moduleRowSelector: 'tbody>tr[role="row"]',
    exportButton: '[mattooltip="Export"]',
    exportFileLabel: 'Save to file',
    exportIPFSLabel: 'Copy message identifier',
    createFinalBtn: 'div.g-dialog-actions-btn',
    tagCreationModal: 'tags-create-dialog',
    createTagButton: ' Create a Tag ',
    tagNameInput: '[ng-reflect-name="name"]',
    tagDeleteButton: 'div.delete-tag',
    tagDescInput: '[ng-reflect-name="description"]',
    tagsListRequest: '/api/v1/tags/',
    tagsDeleteRequest: '/api/v1/tags/*',
};

export class ModulesPage {

    openModulesTab() {
        cy.visit(URL.Root + URL.Modules);
        Checks.waitForLoading();
        // The list is loaded once either its rows or the empty-state message are rendered.
        cy.get(`${List.row}, div.not-exist`, { timeout: 30000 }).should('exist');
    }

    _row(name) {
        return cy.get(List.row, { timeout: 30000 }).filter(nameCellMatches(name));
    }

    createNewModule(moduleName) {
        cy.contains(List.toolbarButton, 'Create a Module').click();
        cy.get(List.dialog, { timeout: 15000 }).find('input#name').type(moduleName);
        cy.get(List.dialog).find('input#name').should('have.value', moduleName);
        cy.get(List.dialog).contains('button', 'Create').click();
        Checks.waitForLoading();
        this._row(moduleName).should('exist');
    }

    _openImportDialog() {
        cy.contains(List.toolbarButton, 'Import').click();
        cy.get(CommonElements.dialogWindow, { timeout: 15000 }).should('be.visible');
    }

    // The preview dialog that follows both imports: its footer holds the Import button that creates the module.
    // Imported archives keep their own name, so success means one more row than before, not just a row.
    _importAndExpectNewRow(name, startImport) {
        const countRows = () => cy.get('body').then(($body) => $body.find(List.row).filter(importedNameMatches(name)).length);
        countRows().then((rowsBefore) => {
            this._openImportDialog();
            startImport();
            // The preview opens over the import dialog and both footers have an Import button: the preview is "Import module".
            cy.contains(CommonElements.dialogWindow, 'Import module', { timeout: 60000 })
                .find(List.previewImportButton).should('not.be.disabled').click();
            Checks.waitForLoading();
            cy.get(List.row, { timeout: 30000 }).should(($rows) => {
                expect($rows.filter(importedNameMatches(name)).length).to.eq(rowsBefore + 1);
            });
        });
    }

    importNewModuleIPFS(messageId, name) {
        this._importAndExpectNewRow(name, () => {
            cy.get(CommonElements.dialogWindow).contains('Import from IPFS').click();
            // The field re-renders as soon as the typed text is a valid id and drops the rest of the
            // keystrokes, so set the whole value at once.
            cy.get(List.ipfsInput).invoke('val', messageId).trigger('input');
            cy.get(List.ipfsInput).should('have.value', messageId);
            cy.get(CommonElements.dialogWindow).find(List.previewImportButton).should('not.be.disabled').click();
        });
    }

    importNewModuleFile(fileName, name) {
        this._importAndExpectNewRow(name, () => dropFile(fileName));
    }

    deleteModule(moduleName) {
        // Only drafts can be deleted, and imported archives may share their name with a published module.
        const isDraft = (_, row) => row.querySelector(List.statusCell)?.textContent.trim() === 'Draft';
        const draftRows = () => cy.get(List.row, { timeout: 30000 }).filter(importedNameMatches(moduleName)).filter(isDraft);
        draftRows().first().find(List.deleteIcon).click();
        cy.get(List.dialog, { timeout: 15000 }).find(List.deleteConfirm).click();
        Checks.waitForLoading();
        cy.get('body').should(($body) => {
            expect($body.find(List.row).filter(importedNameMatches(moduleName)).filter(isDraft).length).to.eq(0);
        });
    }

    checkStatus(name, status) {
        this._row(name).find(List.statusCell).should('contain.text', status);
    }

    openExportModal(name) {
        this._row(name).find(List.exportIcon).click();
        cy.get(CommonElements.dialogWindow, { timeout: 15000 }).should('be.visible');
    }

    exportModuleAsFile(name) {
        this.openExportModal(name);
        cy.get(CommonElements.dialogWindow).find(List.exportFileButton).click();
        cy.verifyDownload('.module', { contains: true });
    }

    exportModuleAsMessageId(name) {
        this.openExportModal(name);
        cy.get(CommonElements.dialogWindow).find(List.exportMessageIdButton).realClick();
        cy.window().then((win) => {
            win.navigator.clipboard.readText().then((text) => {
                //regex numbers.numbers
                expect(text).to.match(/\d+\.\d+/g);
            });
        });
    }

    verifyThatButtonDisabled(buttonText) {
        cy.get(CommonElements.dialogWindow).contains('button', buttonText).should('be.disabled');
    }

    publishModule(moduleName) {
        this._row(moduleName).find(List.publishButton).click();
        Checks.waitForLoading();
        this.checkStatus(moduleName, 'Published');
    }

    addTag(name, tagName) {
        addTag(() => this._row(name), tagName);
    }

    deleteTag(name, tagName) {
        deleteTag(() => this._row(name), tagName);
    }

    verifyButtonsAndHeaders() {
        cy.contains(List.toolbarButton, 'Create a Module').should('be.visible');
        cy.contains(List.toolbarButton, 'Import').should('be.visible');
        const expected = ['Name', 'Description', 'Tags', 'Status', 'Operations'];
        cy.get(List.headerCell).should('have.length', expected.length).each(($th, i) => {
            expect($th.text().trim()).to.eq(expected[i]);
        });
    }

    verifyDraftModuleDataAndActions(name) {
        this._row(name).should(($row) => {
            expect($row.find(List.tagsExplorer).find(List.tagCreateButton).length, 'Create a Tag').to.eq(1);
            expect($row.find(List.statusCell).text().trim()).to.eq('Draft');
            expect($row.find(List.publishButton).prop('disabled'), 'Publish is enabled').to.eq(false);
            expect($row.find(List.exportIcon).length, 'export').to.eq(1);
            expect($row.find(List.editIcon).length, 'edit').to.eq(1);
            expect($row.find(List.deleteIcon).length, 'delete').to.eq(1);
        });
    }

    verifyPublishedModuleDataAndActions(name) {
        this._row(name).should(($row) => {
            expect($row.find(List.statusCell).text().trim()).to.eq('Published');
            expect($row.find(List.publishButton).prop('disabled'), 'Publish is disabled').to.eq(true);
            expect($row.find(List.exportIcon).length, 'export').to.eq(1);
            expect($row.find(List.editIcon).length, 'edit').to.eq(1);
            expect($row.find(List.deleteIcon).length, 'delete').to.eq(1);
        });
    }

    openEditingModule(name) {
        cy.contains(name).parent().find(ModulesPageLocators.moduleEditButton).click();
        Checks.waitForElement(ModulesPageLocators.moduleBlock, undefined, 5000);
    }

    editModuleProperty(property, name) {
        cy.wait(500)
        if (property == 'Description')
            {cy.contains('td.cellName', new RegExp('^' + property + '$', 'g')).parent().find(CommonElements.textarea).clear().type(name);}
        else
            {cy.contains('td.cellName', new RegExp('^' + property + '$', 'g')).parent().find(CommonElements.Input).clear().type(name);}
    }

    saveModuleEditing() {
        cy.get(ModulesPageLocators.saveModuleEditing).click();
    }

    backToModulesList() {
        cy.get(ModulesPageLocators.backButton).click();
    }

    verifyModuleProperty(name, property, value) {
        if (property == 'Description')
            {cy.contains('td', name).siblings('.cell-description').should('have.text', value + ' ');}
    }

    addNewBlock(name) {
        cy.contains(ModulesPageLocators.componentsBlock, name).click({ force: true });
    }

    checkBlockExists(name) {
        cy.get(ModulesPageLocators.blockItemName(name)).should('be.visible');
    }

    editBlockName(name, newName) {
        this.clickOnBlock(name);
        this.editModuleProperty('Tag', newName);
    }

    clickOnBlock(name) {
        cy.get(ModulesPageLocators.blockItemName(name)).should('be.visible').click({ force: true });
    }

    expandBlock(name) {
        cy.get(ModulesPageLocators.expandBlockBtn(name)).click({ force: true });
    }

    checkBlockNotExist(name) {
        cy.wait(10000)
        cy.get(ModulesPageLocators.blockItemName(name)).should('not.exist');
    }

    clickOnDeleteBlockButton() {
        cy.get(ModulesPageLocators.deleteBlockBtn).click({ force: true });
    }

    checkFieldsInEditModuleIsNotEditable() {
        cy.contains('td', new RegExp('^Name$', 'g')).parent().find(CommonElements.Input).should('have.attr', 'readonly', 'readonly');
        cy.contains('td', new RegExp('^Topic Description$', 'g')).parent().find(CommonElements.Input).should('have.attr', 'readonly', 'readonly');
        cy.contains('td', new RegExp('^Description$', 'g')).parent().find(CommonElements.textarea).should('have.attr', 'readonly', 'readonly');
    }

    exportFile(moduleName) {
        cy.contains(moduleName).parent().find(ModulesPageLocators.exportButton).click();
        cy.contains(ModulesPageLocators.exportFileLabel).click();
    }

    exportIPFS(moduleName) {
        cy.contains(moduleName).parent().find(ModulesPageLocators.exportButton).click();
        cy.contains(ModulesPageLocators.exportIPFSLabel).click();
    }

    checkTheTextIsPresentInModule(text) {
        cy.contains(text).should('exist');
    }
}
