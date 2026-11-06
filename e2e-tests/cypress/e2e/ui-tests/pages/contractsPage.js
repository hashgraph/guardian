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

    errorToast: '.p-toast-message-error',
    toastClose: 'button.p-toast-close-button',
};

// A contract can only be imported about 100 s after it was deployed: before that the node answers
// INVALID_CONTRACT_ID. A deployment should be usable within seconds, see
// pending-issues/contract-import-right-after-deployment-fails.md before lowering or removing this.
const IMPORT_ACCEPTED_WITHIN = 100000;
const IMPORT_RETRY_PAUSE = 5000;

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

    // Fills the Description field of the create dialog, confirms, and waits for the new row.
    fillContract(name) {
        this._confirmDialog(name);
        this._row(name);
    }

    _confirmDialog(description) {
        cy.get(L.dialogInput('description')).invoke('val', description).trigger('input');
        cy.get(L.dialogInput('description')).should('have.value', description);
        cy.get(L.dialogConfirm).click();
        Checks.waitForLoading();
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

    // Imports the contract and waits for its row, repeating the import while the network still
    // rejects the contract id (see IMPORT_ACCEPTED_WITHIN); any other outcome fails at once.
    importContract(contractId, name) {
        cy.then(() => {
            const deadline = Date.now() + IMPORT_ACCEPTED_WITHIN;
            const attempt = () => {
                cy.get(L.importButton, { timeout: TIMEOUTS.ui }).click();
                cy.get(L.dialog, { timeout: TIMEOUTS.ui }).should('be.visible');
                // the dialog drops keystrokes while it re-renders: set the whole value at once
                cy.get(L.dialogInput('contractId')).invoke('val', contractId).trigger('input');
                cy.get(L.dialogInput('contractId')).should('have.value', contractId);
                this._confirmDialog(name);
                cy.get('body', { timeout: TIMEOUTS.backend }).should(($body) => {
                    const imported = $body.find(L.row).filter((_, row) => hasDescription(row, name)).length > 0;
                    expect(imported || $body.find(L.errorToast).length > 0, 'a new row or an error toast').to.eq(true);
                }).then(($body) => {
                    if ($body.find(L.row).filter((_, row) => hasDescription(row, name)).length > 0) {
                        return;
                    }
                    const reason = $body.find(L.errorToast).text().trim();
                    if (!reason.includes('contract id is invalid') || Date.now() >= deadline) {
                        throw new Error(`Importing contract ${contractId} failed: ${reason}`);
                    }
                    cy.get(L.toastClose).click({ multiple: true });
                    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the network rejects the id until the deployment is usable, there is nothing to wait for in the page
                    cy.wait(IMPORT_RETRY_PAUSE, { log: false });
                    attempt();
                });
            };
            attempt();
        });
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
