import URL from '../../../support/GuardianUrls';
import { waitForPageReady, waitForPageSettled, waitForLocation } from '../../../support/pageReadiness';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

const L = {
    // user grid (route /user-management)
    searchInput: 'input.search-input',
    userRow: 'tr.guardian-grid-row',
    userName: 'span.user-name',
    // The page's loading overlay. It is a sibling of the content, which stays
    // in the DOM underneath it: presence markers for the content pass while
    // the overlay covers the page, so readiness is gated on the overlay being
    // gone.
    loadingOverlay: 'app-user-management div.loading',
    // detail page (route /user-management/:username)
    detailName: 'span.policy-identity-name',
    assignedTab: 'p-tabs.user-tabs p-tab',
    // assigned policies table
    policyTable: 'table.policy-table',
    policyName: 'td.policy-name',
    assignSwitch: 'label.switch input[type="checkbox"]',
    // table paginator (10/25 per page)
    paginatorRange: 'div.table-paginator span.color-grey-6',
    paginatorNext: 'div.table-paginator svg-icon[src*="right-arrow"]',
};

export class UserManagementPage {

    openUserManagementTab() {
        cy.visit(URL.Root + URL.UserManagement);
        waitForPageReady('p-table.guardian-grid-table, div.not-exist');
        // The presence gate above cannot see the overlay: the content it
        // covers is always in the DOM.
        waitForPageSettled(L.loadingOverlay);
    }

    /**
     * Assigns `policyName` to `userName` (user grid -> detail page -> Assigned
     * policies tab). The switch toggles on click and the toggle is idempotent:
     * an already-assigned policy is left alone, so re-runs against a policy whose
     * name collides with a leftover still work.
     */
    assignPolicyToUser(userName, policyName) {
        // Search first: the grid is paginated and users from earlier runs accumulate.
        // Enter commits the filter before the row click: a plain click blurs the
        // search input, and that change navigation would win the race against the
        // row's detail navigation, leaving the test on the list page.
        cy.get(L.searchInput, { timeout: TIMEOUTS.backend }).clear();
        cy.get(L.searchInput).type(userName + '{enter}');
        // The Enter commits the filter (onFilter -> loadData), which re-raises
        // the overlay until the refetch settles.
        waitForPageSettled(L.loadingOverlay);
        waitForLocation(`username=${encodeURIComponent(userName)}`, { part: 'search', timeout: TIMEOUTS.ui });
        cy.get(L.userRow, { timeout: TIMEOUTS.backend }).filter((_, el) => {
            const cell = el.querySelector(L.userName);
            return cell && cell.textContent.trim() === userName;
        }).click();

        cy.get(L.detailName, { timeout: TIMEOUTS.backend }).should('contain.text', userName);
        cy.get(L.assignedTab, { timeout: TIMEOUTS.ui }).contains('Assigned policies').click();

        cy.get(L.policyTable, { timeout: TIMEOUTS.backend });
        this._policyRow(policyName, 0).then(($name) => {

            return cy.wrap($name).closest('tr').find(L.assignSwitch);
        }).then(($switch) => {
            if ($switch.prop('checked')) {
                cy.log(`Policy ${policyName} is already assigned to ${userName}`);
                return;
            }

            return cy.wrap($switch.first()).click({ force: true });
        });
    }

    /**
     * The row of `policyName` in the assigned policies table, walking the
     * paginator forward when the table holds more than one page (newest first,
     * so the current run's policy leads; the walk is a leftover safeguard).
     */
    _policyRow(policyName, depth) {
        if (depth > 10) {
            throw new Error(`Policy "${policyName}" not found in the assigned policies table`);
        }
        return cy.get(`${L.policyTable} ${L.policyName}`, { timeout: TIMEOUTS.backend, log: false }).then(($names) => {
            const row = $names.toArray().find((el) => Cypress.$.trim(el.textContent) === policyName);
            if (row) {
                return cy.wrap(row, { log: false });
            }
            return cy.get(L.paginatorRange, { timeout: TIMEOUTS.ui, log: false }).then(($range) => {
                const match = ($range.text() || '').match(/(\d+)\s*–\s*(\d+)\s*of\s*(\d+)/);
                const hasMore = match && Number(match[2]) < Number(match[3]);
                if (!hasMore) {
                    throw new Error(`Policy "${policyName}" not found in the assigned policies table (${($range.text() || '').trim()})`);
                }
                const rangeBefore = $range.text();
                cy.get(L.paginatorNext, { timeout: TIMEOUTS.ui }).click({ force: true });
                cy.get(L.paginatorRange, { timeout: TIMEOUTS.ui, log: false }).should(($next) => {
                    expect($next.text(), 'the paginator range after Next').to.not.eq(rangeBefore);
                });
                return this._policyRow(policyName, depth + 1);
            });
        });
    }
}
