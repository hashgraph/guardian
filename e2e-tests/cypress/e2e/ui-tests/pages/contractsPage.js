import URL from '../../../support/GuardianUrls';
import * as Checks from '../../../support/checkingMethods';
import { addTag, deleteTag } from '../../../support/tagsExplorer';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

const L = {
    // Actions bar
    tab: '.tabs-nav p-tab',
    createButton: 'button.button[label="Create Contract"]',
    importButton: 'button.button[label="Import"]',

    // Dialogs (create/import use the shared data-input dialog)
    dialog: 'div.guardian-dialog',
    dialogConfirm: 'div.guardian-dialog button.guardian-button-primary',
    // The dialog binds [formControlName], which leaves no attribute in the DOM: address inputs by placeholder.
    dialogInput: (name) => `div.guardian-dialog input[placeholder="${{ contractId: 'Contract Identifier', description: 'Description' }[name]}"]`,

    // Table
    row: 'tr.card-row',
    header: 'tr.header th',
    idCell: 'td.contract-column',
    descCell: 'td.description-column',
    tagsCell: 'td.tags-column',
    tagsExplorer: 'tags-explorer',
    permissionsCell: 'td.permissions-column',
    operationsCell: 'td.operations-column',
    operationsMenu: 'select-menu-button .select-menu',
    operationsItem: '.select-menu-item',
    operationsItemTitle: '.select-menu-item-title',

};

const hasDescription = (row, name) => row.querySelector(L.descCell)?.textContent.trim() === name;

export class ContractsPage {

    openContractsTab() {
        cy.visit(URL.Root + URL.Contracts);
        Checks.waitForLoading();
    }

    openContractTypeTab(type) {
        const label = type === 'wipe' ? 'Token Wiping Contracts' : 'Token Retirement Contracts';
        cy.get(L.tab, { timeout: TIMEOUTS.ui }).contains(label).click();
        Checks.waitForLoading();
    }

    _row(name) {
        return cy.get(L.row, { timeout: TIMEOUTS.backend })
            .filter((_, row) => hasDescription(row, name));
    }

    createContract() {
        cy.get(L.createButton, { timeout: TIMEOUTS.ui }).click();
        cy.get(L.dialog, { timeout: TIMEOUTS.ui }).should('be.visible');
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

    // Creates a contract of the given type ('wipe' | 'retire') and waits for its row.
    createContractNamed(type, name) {
        this.openContractTypeTab(type);
        this.createContract();
        this.fillContract(name);
    }

    // Yields the Hedera contract id shown in the row of the contract.
    getContractId(name) {
        return this._row(name).find(L.idCell).invoke('text').then((text) => text.trim());
    }

    // Removes the contract of the given type from the list.
    removeContractNamed(type, name) {
        this.openContractTypeTab(type);
        this.removeContract(name);
    }

    importContract(contractId) {
        cy.get(L.importButton, { timeout: TIMEOUTS.ui }).click();
        cy.get(L.dialog, { timeout: TIMEOUTS.ui }).should('be.visible');
        cy.get(L.dialogInput('contractId')).clear();
        cy.get(L.dialogInput('contractId')).type(contractId);
    }

    addTag(contractName, tagName) {
        addTag(() => this._row(contractName), tagName);
    }

    deleteTag(contractName, tagName) {
        deleteTag(() => this._row(contractName), tagName);
    }

    removeContract(name) {
        this._row(name).find(L.operationsMenu).click();
        // Match the title exactly: the "Remove wiper" description also reads "Remove contract wiper."
        // The title ignores pointer events, so the click goes to the menu item around it.
        cy.contains(L.operationsItemTitle, /^Remove contract$/, { timeout: TIMEOUTS.ui }).parent().click();
        Checks.waitForLoading();
        cy.get('body').should(($body) => {
            expect($body.find(L.row).filter((_, row) => hasDescription(row, name)).length).to.eq(0);
        });
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
