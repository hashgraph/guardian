import URL from '../../../support/GuardianUrls';
import * as Checks from '../../../support/checkingMethods';
import { dropFile } from '../../../support/importFlow';
import { addTag, deleteTag } from '../../../support/tagsExplorer';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

// The schemas list (tree table grouped by policy, newest first) and the full-page schema editor.
const List = {
    row: 'tr.guardian-grid-row',
    nameCell: 'td .text-truncate',
    searchInput: 'input[placeholder="Search"]',
    toolbarButton: (tooltip) => `span[ptooltip="${tooltip}"] p-button`,
    publishButton: 'div.btn-approve:contains("Publish")',
    activateButton: 'div.btn-approve:contains("Active")',
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
    backCrumb: 'button.sc-back-crumb',
};

const DELETABLE = ':not(:has(.status-PUBLISHED))';

const nameCellMatches = (name) => (_, row) => row.querySelector(List.nameCell)?.textContent.trim() === name;

export class SchemaPage {

    // `type` is the schemas tab: policy | tool | module | tag | system.
    openSchemasTab(type = 'policy') {
        cy.visit(`${URL.Root}${URL.Schemas}?type=${type}`);
        Checks.waitForLoading();
        // The list is loaded once either its rows or the empty-state message are rendered.
        cy.get(`${List.row}, div.guardian-user-not-data`, { timeout: TIMEOUTS.backend }).should('exist');
    }

    openSchemasSubtab(name) {
        cy.contains('p-tab', `${name} Schemas`).then(($tab) => {
            if ($tab.attr('data-p-active') !== 'true') {
                cy.wrap($tab).click();
            }
        });
        Checks.waitForLoading();
    }

    // The policy list is searched server-side by name, so a schema is found whatever page or policy
    // group it is in; the tag and system lists are short flat tables without a search box.
    _row(name) {
        cy.get('body').then(($body) => {
            if ($body.find(List.searchInput).length) {
                cy.get(List.searchInput).clear();
                cy.get(List.searchInput).type(`${name}{enter}`);
                Checks.waitForLoading();
            }
        });
        return cy.get(List.row, { timeout: TIMEOUTS.backend }).filter(nameCellMatches(name));
    }

    // Creates a draft schema with one field (an empty schema cannot be saved) in the editor, for
    // the tab the list is on.
    createSchema(schemaName) {
        cy.get(List.toolbarButton('Create a Schema')).click();
        cy.location('pathname', { timeout: TIMEOUTS.ui }).should('include', 'schema-configuration');
        cy.get(Editor.newSchemaNameInput, { timeout: TIMEOUTS.ui }).invoke('val', schemaName).trigger('input');
        cy.get(Editor.newSchemaNameInput).should('have.value', schemaName);
        cy.contains('button', 'Create').click();
        cy.contains(Editor.sidebarTab, 'Fields').click();
        cy.contains('String').click();
        cy.get(Editor.fieldDescriptionInput).type('A field');
        this._saveEditor();
        cy.get(Editor.backCrumb).click();
        cy.location('pathname', { timeout: TIMEOUTS.ui }).should('not.include', 'schema-configuration');
        cy.get(`${List.row}, div.guardian-user-not-data`, { timeout: TIMEOUTS.backend }).should('exist');
        this._row(schemaName).should('exist');
    }

    publishTagSchema(name) {
        this._row(name).find(List.publishButton).click();
        Checks.waitForTaskComplete();
        Checks.waitForLoading();
        this._row(name).should('contain.text', 'Published');
    }

    activateSystemSchema(name) {
        this._row(name).find(List.activateButton).click();
        Checks.waitForLoading();
        this._row(name).should('contain.text', 'Active');
    }

    // Yields the entity type (third column) of a system schema.
    systemSchemaEntity(name) {
        return this._row(name).find('td:nth-child(3)').invoke('text').then((text) => text.trim());
    }

    // Activating a schema deactivates the active one of its entity, so a spec that activates its own
    // schema gives the entity back to the built-in schema (the one without an owner).
    activateBuiltInSystemSchema(entity) {
        cy.get(List.row, { timeout: TIMEOUTS.backend })
            .filter((_, row) => row.querySelector('td:nth-child(3)')?.textContent.trim() === entity
                && row.querySelector('td:nth-child(2)')?.textContent.trim() === '')
            .find(List.activateButton)
            .click();
        Checks.waitForLoading();
    }

    _saveEditor() {
        cy.contains('button', 'Save all').click();
        Checks.waitForLoading();
        cy.contains('button', 'Save all').should('not.have.class', 'dirty');
    }

    // Imports the schema into the first policy offered by the preview dialog.
    _importFromPreview(schemaName) {
        cy.contains(List.dialog, 'Schema Import Preview', { timeout: TIMEOUTS.backend }).as('preview');
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
        cy.get(List.versionInput, { timeout: TIMEOUTS.ui }).invoke('val', version).trigger('input');
        cy.get(List.versionInput).should('have.value', version);
        cy.get(List.dialog).contains('button', 'Ok').click();
        Checks.waitForTaskComplete();
        Checks.waitForLoading();
        this._row(name).should('contain.text', 'Published');
    }

    _openMenu(name) {
        this._row(name).find(List.menuIcon).click();
        cy.get(List.menuButton, { timeout: TIMEOUTS.ui }).should('be.visible');
    }

    // Only schemas that are neither published nor active (drafts, or inactive system schemas) can
    // be deleted, and the same schema name can exist under several policies.
    deleteSchema(name) {
        this._row(name).filter(DELETABLE).first().find(List.menuIcon).click();
        cy.get(List.menuButton, { timeout: TIMEOUTS.ui }).should('be.visible');
        cy.contains(List.menuButton, 'Delete schema').click();
        cy.get(List.deleteConfirm, { timeout: TIMEOUTS.ui }).click();
        Checks.waitForLoading();
        cy.get('body').should(($body) => {
            expect($body.find(List.row).filter(nameCellMatches(name)).filter(DELETABLE).length).to.eq(0);
        });
    }

    documentView(name) {
        this._openMenu(name);
        cy.contains(List.menuButton, /^\s*Schema\s*$/).click();
        cy.contains(List.dialog, 'Schema').should('exist');
    }

    editPolicySchema(name, newName) {
        this._row(name).find(List.editIcon).click();
        cy.location('pathname', { timeout: TIMEOUTS.ui }).should('include', 'schema-configuration');
        cy.get(Editor.schemaNameInput, { timeout: TIMEOUTS.ui }).invoke('val', newName).trigger('input');
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

}
