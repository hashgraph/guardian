import URL from '../../../support/GuardianUrls';
import * as Checks from '../../../support/checkingMethods';

const L = {
    // Actions bar
    tab: '.tabs-nav p-tab',
    createButton: 'button.button[label="Create Contract"]',
    importButton: 'button.button[label="Import"]',

    // Dialogs (create/import use the shared data-input dialog)
    dialog: 'div.guardian-dialog',
    dialogConfirm: 'div.guardian-dialog button.guardian-button-primary',
    dialogInput: (name) => `div.guardian-dialog input[formcontrolname="${name}"]`,

    // Table
    row: 'tr.card-row',
    header: 'tr.header th',
    idCell: 'td.contract-column',
    descCell: 'td.description-column',
    tagsCell: 'td.tags-column',
    permissionsCell: 'td.permissions-column',
    operationsCell: 'td.operations-column',
    operationsMenu: 'select-menu-button .select-menu',
    operationsItem: '.select-menu-item',

    // Tags
    tagsExplorer: 'tags-explorer',
    tagCreateButton: 'tags-explorer button:contains("Create a Tag")',
    tagChip: 'tags-explorer .main-tag',
    tagDialog: 'tags-explorer-dialog',
    tagChipInDialog: 'tags-explorer-dialog div.name',
    tagDetailDelete: 'tags-explorer-dialog .details-container svg-icon[src*="delete"]',
    tagDeleteConfirm: 'button[label="Delete"]',
    tagCreateDialog: 'tags-create-dialog',
    tagNameInput: 'tags-create-dialog input[formcontrolname="name"]',
    tagDescInput: 'tags-create-dialog input[formcontrolname="description"]',
    tagCreateSubmit: 'tags-create-dialog button[label="Create"]',
};

export class ContractsPage {

    openContractsTab() {
        cy.visit(URL.Root + URL.Contracts);
        Checks.waitForLoading();
    }

    openContractTypeTab(type) {
        const label = type === 'wipe' ? 'Token Wiping Contracts' : 'Token Retirement Contracts';
        cy.get(L.tab, { timeout: 15000 }).contains(label).click();
        Checks.waitForLoading();
    }

    _row(name) {
        return cy.get(L.row, { timeout: 30000 })
            .filter(`:has(${L.descCell}:text-is("${name}"))`);
    }

    createContract() {
        cy.get(L.createButton, { timeout: 15000 }).click();
        cy.get(L.dialog, { timeout: 15000 }).should('be.visible');
    }

    // Shared by create/import: fills the Description field, confirms, and waits
    // for the new row. contractId is only present in the import dialog.
    fillContract(name, contractId) {
        if (contractId) {
            cy.get(L.dialogInput('contractId')).clear();
            cy.get(L.dialogInput('contractId')).type(contractId);
        }
        cy.get(L.dialogInput('description')).clear();
        cy.get(L.dialogInput('description')).type(name);
        cy.get(L.dialogConfirm).click();
        Checks.waitForLoading();
        this._row(name);
    }

    importContract(contractId) {
        cy.get(L.importButton, { timeout: 15000 }).click();
        cy.get(L.dialog, { timeout: 15000 }).should('be.visible');
        cy.get(L.dialogInput('contractId')).clear();
        cy.get(L.dialogInput('contractId')).type(contractId);
    }

    addTag(contractName, tagName) {
        this._row(contractName).find(L.tagsExplorer).find(L.tagCreateButton, { timeout: 15000 }).click();
        cy.get(L.tagCreateDialog, { timeout: 15000 }).should('be.visible');
        cy.get(L.tagNameInput).clear();
        cy.get(L.tagNameInput).type(tagName);
        cy.get(L.tagDescInput).clear();
        cy.get(L.tagDescInput).type(tagName);
        cy.get(L.tagCreateSubmit).click();
        Checks.waitForLoading();
        this._row(contractName).find(L.tagChip).should('contain.text', tagName);
    }

    deleteTag(contractName, tagName) {
        this._row(contractName).find(L.tagChip).contains(tagName).click();
        cy.get(L.tagDialog, { timeout: 15000 }).should('be.visible');
        cy.get(L.tagChipInDialog).contains(tagName).click();
        cy.get(L.tagDetailDelete, { timeout: 15000 }).first().click();
        cy.get('body').then((body) => {
            if (body.find(L.tagDeleteConfirm).length) {
                cy.get(L.tagDeleteConfirm).click();
            }
        });
        Checks.waitForLoading();
        cy.get(L.tagDialog).find(L.tagChipInDialog).contains(tagName).should('not.exist', { timeout: 15000 });
    }

    removeContract(name) {
        this._row(name).find(L.operationsMenu).click();
        cy.get(L.operationsItem, { timeout: 15000 }).contains('Remove contract').click();
        Checks.waitForLoading();
        cy.get(L.row).filter(`:has(${L.descCell}:text-is("${name}"))`).should('not.exist', { timeout: 20000 });
    }

    contractIdRowExists(contractId) {
        cy.get('body').then(($body) => {
            expect($body.find(L.row).filter(`:has(${L.idCell}:contains("${contractId}"))`).length).to.be.greaterThan(0);
        });
    }

    verifyButtonsAndHeaders() {
        cy.get(L.createButton).should('be.visible');
        cy.get(L.importButton).should('be.visible');
        const expected = ['HEDERA CONTRACT ID', 'DESCRIPTION', 'TAGS', 'PERMISSIONS', 'OPERATIONS'];
        cy.get(L.header).should('have.length', expected.length).each(($th, i) => {
            expect($th.text().trim()).to.eq(expected[i]);
        });
    }

    verifyContractDataAndActions(name) {
        this._row(name).should(($row) => {
            expect($row.find('hedera-explorer').length).to.be.greaterThan(0);
            expect($row.find(L.descCell).text().trim()).to.eq(name);
            expect($row.find(L.tagsExplorer).length).to.be.greaterThan(0);
            expect($row.find(L.permissionsCell + ' .permissions').length).to.be.greaterThan(0);
            expect($row.find(L.operationsCell + ' select-menu-button').length).to.be.greaterThan(0);
        });
    }
}
