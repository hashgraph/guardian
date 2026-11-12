import URL from '../../../support/GuardianUrls';
import { waitForPageReady } from '../../../support/pageReadiness';
import { dropFile, waitForTaskRoundtrip, replaceInaccessibleTools } from '../../../support/importFlow';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

// The current app renders the tools list on the PrimeNG 21 base: a plain
// table (guardian-grid-table/row), the search box reuses the
// search-policy-input class, and the toolbar Import is a <p-button>
// component - its label is a property input, so no label attribute survives
// to the DOM and the button is matched by class + text.
const L = {
    importButton: 'p-button.toolbar-btn-primary:contains("Import")',
    dialog: 'div.guardian-dialog',
    searchInput: 'div.tool-filters input.search-policy-input',
    applyFilters: 'button[label="Apply Filters"]',
    row: 'tr.guardian-grid-row',
    nameCell: 'td.row-cell-text',
    statusSelect: 'p-select.status-actions-dropdown',
    statusIndicator: 'div.p-tag, div.chip',
    // The list's paginator (app-paginator): the per-page select, the
    // "x – y of z" counter, and the next-page arrow.
    pageSizeSelect: 'div.table-paginator p-select',
    pageCounter: 'div.table-paginator span.color-grey-6',
    nextPageButton: 'div.table-paginator svg-icon[src*="right-arrow"]',
    // Scoped to the page component: the full-page preloader is its direct
    // child, and nested div.loading panels must not block the wait.
    loadingOverlay: 'app-tools-list > div.loading',
    versionInput: 'div.guardian-dialog input#version',
    publishButton: 'div.guardian-dialog div.dialog-footer button:contains("Publish")',
};

// Exact-name match on a grid row; the shared predicate of the row readers
// (_row, _exactRowExists) and the page walk (_pageToRow).
const nameCellIs = (rowEl, name) => {
    const cell = rowEl.querySelector(L.nameCell);
    return cell && cell.textContent.trim() === name;
};

export class ToolsPage {
    /**
     * Visits the tools list. The async-progress task page redirects to
     * /tool-configuration after tool imports and publishes regardless of the
     * `last` URL, so every round trip must be followed by a fresh visit; the
     * search query param makes the list come back pre-filtered. The filtered
     * list still paginates (10 per page, newest first), so the row readers
     * widen the grid and walk the pages before matching - see _pageToRow.
     */
    openToolsTab(search) {
        const url = URL.Root + URL.Tools + (search ? `?search=${encodeURIComponent(search)}` : '');
        cy.visit(url);
        // waitForPageReady polls with querySelector, which cannot use the
        // :contains in L.importButton. The search bar is the readiness marker:
        // it renders as soon as the tools fetch resolves (the grid below it is
        // a <p-table> component, so no div.guardian-grid-table exists in the
        // DOM, and the grid container is absent for an empty list).
        waitForPageReady('div.tool-filters');
    }

    _search(name) {
        cy.get(L.searchInput, { timeout: TIMEOUTS.ui }).clear();
        cy.get(L.searchInput).type(name);
        cy.get(L.applyFilters, { timeout: TIMEOUTS.ui }).click();
        // applyFilters re-queries the list (and the URL). The grid keeps the
        // stale rows underneath the preloader until the reload lands, so an
        // existence check fired right after the click would read the old
        // unfiltered page; wait for the reload cycle instead.
        cy.get(L.loadingOverlay, { timeout: TIMEOUTS.ui }).should('be.visible');
        cy.get(L.loadingOverlay, { timeout: TIMEOUTS.ui }).should('not.exist');
    }

    /**
     * Whether a row named exactly `name` is on the current grid page. Reads
     * the DOM instead of waiting for the row: an empty filtered list never
     * renders a row, and Cypress 15 command chains have no .catch to absorb
     * that timeout.
     */
    _rowPresent(name) {
        return cy.get('body').then(($body) => {
            const rows = $body.find(L.row);
            return rows.toArray().some((r) => nameCellIs(r, name));
        });
    }

    /**
     * Positions the grid on the page that renders the row named exactly
     * `name`, or on the last page when it has no such row.
     *
     * The search is server-side substring matching and the list paginates at
     * 10 rows per page, newest first: every policy-suite run re-imports the
     * CDM library tools under `_timestamp`-suffixed names (re-imports of an
     * existing name are renamed, and published tools cannot be deleted), so a
     * lived-in workspace buries the exact-name row on a later page and a
     * page-one read would miss it. Widen the grid to the largest page size
     * first, then follow the next-page arrow while the paginator counter
     * ("x – y of z") says more pages exist. A real user narrowing the same
     * search would page through the results the same way.
     */
    _pageToRow(name) {
        return this._rowPresent(name).then((present) => {
            if (present) {
                return; // already rendered on this page: nothing to walk
            }
            return cy.get('body').then(($body) => {
                if ($body.find(L.row).length === 0) {
                    // The table and its paginator render only for a non-empty
                    // list (the template's @if (tools && tools.length > 0)):
                    // with zero filtered rows there is nothing to page through
                    // and the row is absent, so the walk is a no-op (a fresh
                    // workspace's first import) instead of waiting on a
                    // paginator that will never appear.
                    return;
                }
                return this._walkPages(name);
            });
        });
    }

    /**
     * Widens the grid to the largest page size, then follows the next-page
     * arrow while the paginator counter ("x – y of z") says more pages
     * exist; a row present on any page ends up rendered.
     */
    _walkPages(name) {
        cy.get(L.pageSizeSelect, { timeout: TIMEOUTS.ui }).click();
        // :contains('100') cannot match the "10" option, so the largest size.
        cy.get('.p-select-option', { timeout: TIMEOUTS.ui }).contains('100').click();
        cy.get(L.loadingOverlay, { timeout: TIMEOUTS.ui }).should('be.visible');
        cy.get(L.loadingOverlay, { timeout: TIMEOUTS.ui }).should('not.exist');

        const advance = () => this._rowPresent(name).then((present) => {
            if (present) {
                return;
            }
            return cy.get(L.pageCounter).invoke('text').then((text) => {
                const match = text.match(/–\s*(\d+)\s*of\s*(\d+)/);
                if (!match) {
                    throw new Error(`unrecognized paginator counter: "${text}"`);
                }
                const [, shown, total] = match;
                if (Number(shown) >= Number(total)) {
                    return; // last page: the row is absent and the callers' own waits report it
                }
                cy.get(L.nextPageButton, { timeout: TIMEOUTS.ui }).click();
                cy.get(L.loadingOverlay, { timeout: TIMEOUTS.ui }).should('be.visible');
                cy.get(L.loadingOverlay, { timeout: TIMEOUTS.ui }).should('not.exist');
                return advance();
            });
        });
        return advance();
    }

    /**
     * The row whose name cell is exactly `name`. First positions the grid on
     * the page that renders it (_pageToRow), then retries until the row is
     * in the DOM, so the reads below cannot race the page load.
     */
    _row(name) {
        this._pageToRow(name);
        return cy.get(L.row, { timeout: TIMEOUTS.ui }).filter((_, el) => nameCellIs(el, name));
    }

    /**
     * Whether a row named exactly `name` is on the list. openToolsTab()
     * blocks on div.tool-filters, which the template renders only once the
     * search-filtered fetch has landed, and _pageToRow() then walks the
     * pages, so the read below is fresh. Only the exact name counts: a
     * `_timestamp` duplicate from a previous import is a different tool and
     * does not satisfy the policy picker.
     */
    _exactRowExists(name) {
        this._pageToRow(name);
        return this._rowPresent(name);
    }

    /**
     * A tool with this exact name is either already published (re-runs skip),
     * a draft (it gets published), or missing (it is imported from `source`,
     * a .tool archive in the Methodology Library, and then published).
     * Publishing matters: the tool picker in the import previews (tools and
     * policies) only lists published tools, so an unpublished tool cannot be
     * selected as a replacement and would hold the Import button.
     */
    ensureToolPublished(name, source) {
        this.openToolsTab(name);
        this._exactRowExists(name).then((found) => {
            if (!found) {
                this.importToolFromFile(name, source);
            }
        });
        // The import round trip (or the absence of one) ends wherever the app
        // decided - re-land on the pre-filtered list to find the row.
        this.openToolsTab(name);
        this._publishIfDraft(name);
    }

    /**
     * The status cell renders a p-select for draft/dry-run tools (review
     * users) or a chip otherwise, and a tag for published ones. A row that
     * is already published is left alone; a draft goes through the publish
     * flow and the resulting status is asserted.
     */
    _publishIfDraft(name) {
        // _row first positions the grid on the page that renders the exact
        // row, then retries until it is in the DOM, so the status read below
        // cannot race the page load.
        this._row(name).then(($row) => {
            const indicator = $row.find('div.p-tag, div.chip, p-select').first();
            if (indicator.text().includes('Published')) {
                cy.log(`tool ${name} already published`);
                return;
            }
            this._publish(name);
        });
        this.openToolsTab(name);
        this._row(name).find(L.statusIndicator, { timeout: TIMEOUTS.ui })
            .first().invoke('text').should('contain', 'Published');
    }

    /**
     * Opens the row status select, picks Publish, confirms the version dialog
     * and waits for the publish task to complete. The app then redirects to
     * the tool configuration page (not back to the list), so the caller
     * re-lands with openToolsTab.
     */
    _publish(name, version = '1.0.0') {
        this._row(name).find(L.statusSelect, { timeout: TIMEOUTS.ui }).click();
        cy.get('body').find('div.dropdown-item-title', { timeout: TIMEOUTS.ui })
            .contains('Publish')
            .click();
        cy.get(L.versionInput, { timeout: TIMEOUTS.ui }).should('be.visible');
        cy.get(L.versionInput).clear();
        cy.get(L.versionInput).type(version);
        cy.get(L.publishButton, { timeout: TIMEOUTS.ui })
            .should('not.be.disabled')
            .click();
        waitForTaskRoundtrip();
    }

    /**
     * Imports a .tool file. The preview lists the tool's own tool references;
     * ones this gateway cannot resolve are replaced in the workspace picker
     * (e.g. Tool 05 references Tool 07, so Tool 07 must be published first).
     * The import task redirects to the tool configuration page on completion.
     */
    importToolFromFile(name, source) {
        cy.get(L.importButton, { timeout: TIMEOUTS.ui }).click();
        cy.get(L.dialog, { timeout: TIMEOUTS.ui }).should('be.visible');
        dropFile(source);
        // replaceInaccessibleTools waits for the preview dialog itself (the
        // import dialog would otherwise satisfy any footer-based gate).
        replaceInaccessibleTools();
        cy.get(L.dialog).find('div.dialog-footer button:contains("Import")')
            .should('not.be.disabled', { timeout: TIMEOUTS.backend })
            .click();
        waitForTaskRoundtrip();
    }
}
