import URL from '../../../support/GuardianUrls';
import * as Checks from '../../../support/checkingMethods';
import { waitForPageReady } from '../../../support/pageReadiness';
import { addTag, deleteTag } from '../../../support/tagsExplorer';
import { TIMEOUTS, POLL_INTERVAL } from '../../../support/CustomHelpers/timeouts';

// The token lists (/tokens, /tokens-user) and the per-token user views share one
// grid markup: rows are tr.guardian-grid-row and the first cell is a
// span.text-truncate. The per-token user view is opened from a token row's
// options icon; each test user appears there once (their default account).
//
// The token steps of the policies workflows split by role: /tokens-user is
// restricted to the USER route role, so the SR (STANDARD_REGISTRY) gets
// "Access Restricted" there. The SR works from /tokens (token id lookup, KYC,
// balance); the first association is done by the user themself from the
// per-token view, which lists the viewer's own account.
const L = {
    // grids
    gridRow: 'tr.guardian-grid-row',
    // page-ready markers: rendered once the grid (or its empty state) is in
    grid: 'div.guardian-grid-container, div.guardian-user-not-data',
    // token row options icons (open the per-token user view)
    tokenUsersIcon: 'svg-icon[src*="group"]',    // /tokens -> token-config
    tokenAccountsIcon: 'svg-icon[src*="wallet"]', // /tokens-user -> list-of-tokens-user
    // per-token user view cells
    associateButton: 'button.associate-size',
    kycButton: 'button.kyc-size',
    balance: 'div.user-balance',
    // per-row refresh: re-queries the row's association/KYC/balance state
    refreshIcon: 'div.guardian-icon-button svg-icon[src*="refresh-2"]',

    // The 09 tokens suite drives the token-management grid with these locators.
    manage: {
        createTokenButton: 'p-button',
        dialog: 'div.custom-token-dialog',
        deleteDialog: 'div.guardian-dialog',
        tokenNameInput: 'input#tokenName',
        tokenSymbolInput: 'input#tokenSymbol',
        statusSwitch: 'switch-button input[type="checkbox"]',
        keyRow: '.key-value',
        tokenType: 'p-select[formcontrolname="tokenType"]',
        optionItem: 'li[role="option"]',
        iconButton: 'div.guardian-icon-button',
        editIcon: 'svg-icon[src*="edit.svg"]',
        deleteIcon: 'svg-icon[src*="delete.svg"]',
        deleteConfirm: 'button.guardian-button-delete',
        textCell: 'span.text-truncate',
    },
};

export class TokensPage {

    openTokensTab() {
        cy.visit(URL.Root + URL.Tokens);
        waitForPageReady(L.grid, 3);
    }

    openUserTokensTab() {
        cy.visit(URL.Root + URL.TokensUser);
        waitForPageReady(L.grid, 3);
    }

    /**
     * The token row whose POLICIES cell names `policyName`. Token names repeat
     * across runs ('iRec Token') but each run renames its policy to a unique run
     * name, and the list is newest-first, so the current run's token leads page 1.
     */
    _tokenRow(policyName) {
        return cy.contains(L.gridRow, policyName, { timeout: TIMEOUTS.backend });
    }

    // The user row of the open per-token user view, matched on the first cell.
    _userRow(username, timeout = TIMEOUTS.backend) {
        return cy.get(L.gridRow, { timeout }).filter((_, el) => {
            const cell = el.querySelector('span.text-truncate');
            return cell && cell.textContent.trim() === username;
        });
    }

    /**
     * The per-token views re-load once right after a push 202 - while the task
     * is still running - and then wait for the user to refresh, so after a
     * push action the test drives the row's refresh icon until the button
     * label settles on `expected`. `rowQuery` re-derives the row on every
     * pass: a stored row scope (alias or get) detaches when the view
     * re-renders and would fail the subject check.
     */
    _waitForLabelFlip(rowQuery, buttonSelector, expected, timeout = TIMEOUTS.backend) {
        const check = (deadline) => {
            rowQuery().first()
                .find(buttonSelector, { timeout: TIMEOUTS.ui })
                .first()
                .invoke('text')
                .then((text) => {
                    if (Cypress.$.trim(text).includes(expected)) {
                        return;
                    }
                    expect(Date.now(), `"${expected}" did not show up within ${timeout} ms (last label: "${Cypress.$.trim(text)}")`)
                        .to.be.lessThan(deadline);
                    cy.wait(POLL_INTERVAL, { log: false });
                    rowQuery().first()
                        .find(L.refreshIcon, { timeout: TIMEOUTS.ui })
                        .first()
                        .click({ force: true });
                    check(deadline);
                });
        };
        cy.then(() => check(Date.now() + timeout));
    }

    /**
     * Stores the token id of the token whose POLICIES cell names `policyName`
     * (base64, the form the per-token views take as the `tokenId` query
     * param). Run as SR from the /tokens grid.
     */
    storeTokenId(policyName) {
        this._tokenRow(policyName)
            .find('hedera-explorer', { timeout: TIMEOUTS.ui })
            .first()
            .invoke('text')
            .then((tokenId) => {
                expect(tokenId.trim(), 'token id cell').to.not.be.empty;
                Cypress.env('runTokenId', tokenId.trim());
            });
    }

    /**
     * Associates the logged-in user's own account with the run's token (the
     * id stored by storeTokenId) from the per-token view. Idempotent: the
     * switch label flips 'Associate' -> 'Dissociate' when the task lands, a
     * re-run only waits for the row to settle. The per-token view lists the
     * viewer's own relayer account(s) - exactly one for the test users - so
     * the row is the first (and only) one.
     */
    associatePolicyToken() {
        cy.then(() => {
            const tokenId = Cypress.env('runTokenId');
            expect(tokenId, 'call storeTokenId (as SR) before associatePolicyToken')
                .to.be.a('string').and.not.be.empty;
            cy.visit(`${URL.Root}${URL.TokensUser}?tokenId=${btoa(tokenId)}`);
        });
        waitForPageReady(L.grid, 3);
        cy.get(L.gridRow, { timeout: TIMEOUTS.backend }).first().as('accountRow');
        cy.get('@accountRow')
            .find(L.associateButton, { timeout: TIMEOUTS.backend })
            .then(($button) => {
                const label = Cypress.$.trim($button.first().text());
                if (label === 'Associate') {
                    return cy.get('@accountRow').find(L.associateButton).first().click();
                }
                cy.log('Account is already associated');
            });
        this._waitForLabelFlip(() => cy.get(L.gridRow, { timeout: TIMEOUTS.ui }), L.associateButton, 'Dissociate');
    }

    // Grants KYC to `username` in the run's token. Runs after associatePolicyToken
    // (the switch stays disabled while the account is not associated).
    grantKYC(policyName, username) {
        this.openTokensTab();
        this._tokenRow(policyName).find(L.tokenUsersIcon, { timeout: TIMEOUTS.ui }).closest(L.manage.iconButton).click();
        waitForPageReady(L.grid, 3);
        this._userRow(username)
            .find(L.kycButton, { timeout: TIMEOUTS.backend })
            .then(($button) => {
                const label = Cypress.$.trim($button.first().text());
                if (label === 'Grant KYC') {
                    return cy.wrap($button.first()).click();
                }
                cy.log(`Account ${username} is already KYC`);
            });
        this._waitForLabelFlip(() => this._userRow(username), L.kycButton, 'Revoke KYC');
    }

    // Waits until `username`'s balance on the run's token reaches `balance`.
    verifyBalance(policyName, username, balance = ' 1 ') {
        this.openTokensTab();
        this._tokenRow(policyName).find(L.tokenUsersIcon, { timeout: TIMEOUTS.ui }).closest(L.manage.iconButton).click();
        waitForPageReady(L.grid, 3);
        // the balance cell renders only for an associated account; a missing cell
        // means the association state has not landed, so fail with a clear wait
        this._userRow(username)
            .find(L.balance, { timeout: TIMEOUTS.backend })
            .should('exist');
        Checks.waitForBalanceIncrease(balance, username);
    }

    // ---- 09 tokens suite (token-management grid) ----

    // The token row with a cell reading exactly `name` (names are unique per run, newest tokens first).
    _manageRow(name) {
        return cy.get(L.gridRow, { timeout: TIMEOUTS.backend }).filter((_, row) =>
            Array.from(row.querySelectorAll(L.manage.textCell)).some((cell) => cell.textContent.trim() === name));
    }

    // The dialog re-renders while it is typed into and drops the remaining keystrokes, so the whole
    // value is set at once and the form is told through the input event.
    _setInput(selector, value) {
        cy.get(selector).invoke('val', value).trigger('input');
        cy.get(selector).should('have.value', value);
    }

    // A switch-button is a checkbox behind a label; its change event is what the form listens to.
    _toggleKey(keyName) {
        cy.get(L.manage.dialog).contains(L.manage.keyRow, keyName).find(L.manage.statusSwitch).click({ force: true });
    }

    createToken(name, published = false, nft = false, adminKey = true, wipeKey = true, freeze = false, KYC = false) {
        cy.contains('p-button', 'Create token').click();
        cy.get(L.manage.dialog, { timeout: TIMEOUTS.ui }).should('be.visible');
        this._setInput(L.manage.tokenNameInput, name);
        if (published) {
            cy.get(L.manage.dialog).find(L.manage.statusSwitch).first().click({ force: true });
        }
        if (nft) {
            cy.get(L.manage.dialog).find(L.manage.tokenType).click();
            cy.contains(L.manage.optionItem, 'Non-Fungible').click();
        }
        if (!adminKey) {
            this._toggleKey('Admin Key');
        }
        if (!wipeKey) {
            this._toggleKey('Wipe Key');
        }
        if (freeze) {
            this._toggleKey('Freeze Key');
        }
        if (KYC) {
            this._toggleKey('KYC Key');
        }
        cy.get(L.manage.dialog).contains('button', 'Create').click();
        Checks.waitForTaskComplete();
        Checks.waitForLoading();
        this._manageRow(name).should('exist');
    }

    deleteToken(name) {
        // The icons ignore pointer events; the click is handled by the button around them.
        this._manageRow(name).find(L.manage.deleteIcon).closest(L.manage.iconButton).click();
        cy.get(L.manage.deleteDialog, { timeout: TIMEOUTS.ui }).find(L.manage.deleteConfirm).click();
        Checks.waitForTaskComplete();
        Checks.waitForLoading();
        cy.get('body').should(($body) => {
            const rows = $body.find(L.gridRow).filter((_, row) =>
                Array.from(row.querySelectorAll(L.manage.textCell)).some((cell) => cell.textContent.trim() === name));
            expect(rows.length).to.eq(0);
        });
    }

    // Without an admin key a token can be neither deleted nor edited: the row's action is disabled.
    deleteTokenDisabled(name) {
        this._manageRow(name).find(L.manage.deleteIcon).closest(L.manage.iconButton).should('have.attr', 'disabled');
    }

    editToken(name, editname, editSymbol) {
        this._manageRow(name).find(L.manage.editIcon).closest(L.manage.iconButton).click();
        cy.get(L.manage.dialog, { timeout: TIMEOUTS.ui }).should('be.visible');
        // The dialog fills the form from the token after it opens and would overwrite what is typed before that.
        cy.get(L.manage.tokenNameInput, { timeout: TIMEOUTS.ui }).should('have.value', name);
        this._setInput(L.manage.tokenNameInput, editname);
        this._setInput(L.manage.tokenSymbolInput, editSymbol);
        cy.get(L.manage.dialog).contains('button', 'Save').click();
        Checks.waitForTaskComplete();
        Checks.waitForLoading();
        this._manageRow(editname).should('contain.text', editSymbol);
    }

    editTokenDisabled(name) {
        this._manageRow(name).find(L.manage.editIcon).closest(L.manage.iconButton).should('have.attr', 'disabled');
    }

    addTag(name, tagName) {
        addTag(() => this._manageRow(name), tagName);
    }

    deleteTag(name, tagName) {
        deleteTag(() => this._manageRow(name), tagName);
    }
}
