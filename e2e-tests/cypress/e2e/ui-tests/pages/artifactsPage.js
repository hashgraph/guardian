import URL from '../../../support/GuardianUrls';
import * as Checks from '../../../support/checkingMethods';

const L = {
    table: 'div.guardian-grid-table',
    row: 'tr.guardian-grid-row',
    filterSelect: 'div.dropdown-block p-select',
    filterOption: 'li[role="option"]',
    importButton: 'p-button.toolbar-btn-primary',
    dialog: 'div.guardian-dialog',
    policyDropdown: 'p-select#policyDropdown',
    fileInput: 'app-file-drag-n-drop input[type="file"]',
    deleteIcon: 'svg-icon[src*="delete.svg"]',
    deleteConfirm: 'button.guardian-button-delete',
    empty: 'div.not-exist',
};

export class ArtifactsPage {

    openArtifactsTab() {
        cy.visit(URL.Root + URL.Artifacts);
        Checks.waitForLoading();
    }

    // Opens the import dialog, attaches the file to the given policy (the import
    // fires on file load) and waits for the dialog to close.
    importArtifactFrom(policyName, fileName) {
        cy.get(L.importButton, { timeout: 15000 }).should('be.visible').click();
        cy.get(L.dialog, { timeout: 15000 }).should('be.visible');
        cy.get(L.policyDropdown).click();
        cy.contains(L.filterOption, policyName, { timeout: 15000 }).click();
        cy.fixture(fileName, { encoding: null }).then((file) =>
            cy.get(L.fileInput).selectFile(file, { force: true }));
        cy.get(L.dialog, { timeout: 20000 }).should('not.exist');
        Checks.waitForLoading();
    }

    filterByPolicy(policyName) {
        cy.get(L.filterSelect, { timeout: 15000 }).click();
        cy.contains(L.filterOption, policyName, { timeout: 15000 }).click();
        Checks.waitForLoading();
    }

    checkRowExists(policyName, artifactName) {
        cy.get(L.row, { timeout: 20000 }).filter(`:has(span:text-is("${policyName}"))`)
            .should('contain.text', artifactName);
    }

    checkRowNotExists(artifactName) {
        cy.get('body').should(($body) => {
            expect($body.find(L.row).filter(`:contains("${artifactName}")`).length).to.eq(0);
        });
    }

    // Deletes every visible row of the policy (re-imports may suffix duplicate
    // names), until the filtered list is empty.
    deleteAllRowsForPolicy(policyName) {
        const max = 10;
        const step = (deleted) => {
            cy.get('body').then(($body) => {
                const rows = $body.find(L.row).filter(`:has(span:text-is("${policyName}"))`);
                if (deleted >= max || rows.length === 0) {
                    return;
                }
                cy.wrap(rows.first()).find(L.deleteIcon).click();
                cy.get(L.dialog, { timeout: 15000 }).find(L.deleteConfirm).click();
                Checks.waitForLoading();
                step(deleted + 1);
            });
        };
        step(0);
    }

    assertEmpty() {
        cy.get(L.empty, { timeout: 15000 }).should('contain.text', 'No Artifacts');
    }
}
