import URL from '../../../support/GuardianUrls';
import * as Checks from '../../../support/checkingMethods';
import { waitForPageReady } from '../../../support/pageReadiness';

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
    legacy: {
        associatedBtn: 'div.associated-btn',
        createTokenBtn: 'button[label="Create token"]',
        createFinalBtn: 'button[ng-reflect-label="Create"]',
        publishedBtn: '[ng-reflect-on="Published"]',
        adminKey: 'div.key-name:contains(" Admin Key ")',
        wipeKey: 'div.key-name:contains(" Wipe Key ")',
        freezeKey: 'div.key-name:contains(" Freeze Key ")',
        kycKey: 'div.key-name:contains(" KYC Key ")',
        tokenTypeChoose: 'p-dropdown[formcontrolname="tokenType"]',
        tokenDeleteBtn: 'button[ng-reflect-label="Delete"]',
        tokenEditBtn: '[ng-reflect-src="/assets/images/icons/edit.svg"]',
        tokenEditBtnDisabled: '[ng-reflect-svg-class="disabled-color"]',
        adminKeyIsntSet: 'Admin Key is not set',
        tokenNameInput: '[formcontrolname="tokenName"]',
        tokenSymbolInput: '[formcontrolname="tokenSymbol"]',
        saveTokenBtn: 'Save',
        createTagButton: ' Create a Tag ',
        tagNameInput: '[ng-reflect-name="name"]',
        tagDescInput: '[ng-reflect-name="description"]',
        closeWindowButton: "[ng-reflect-label='Close']",
        deleteTagIcon: "svg-icon[svgclass='accent-color-red']",
        createButton: "[ng-reflect-label='Create']",
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
        return cy.contains(L.gridRow, policyName, { timeout: 60000 });
    }

    // The user row of the open per-token user view, matched on the first cell.
    _userRow(username, timeout = 60000) {
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
    _waitForLabelFlip(rowQuery, buttonSelector, expected, retries = 30) {
        const check = (left) => {
            rowQuery().first()
                .find(buttonSelector, { timeout: 20000 })
                .first()
                .invoke('text')
                .then((text) => {
                    if (Cypress.$.trim(text).includes(expected)) {
                        return;
                    }
                    expect(left, `task did not land after ${30 - left} refreshes`)
                        .to.be.greaterThan(0);
                    // Pacing: let the backend task finish before re-querying, so each
                    // refresh has a real chance of landing the new state.
                    // eslint-disable-next-line cypress/no-unnecessary-waiting
                    cy.wait(5000);
                    rowQuery().first()
                        .find(L.refreshIcon, { timeout: 20000 })
                        .first()
                        .click({ force: true });
                    check(left - 1);
                });
        };
        check(retries);
    }

    /**
     * Stores the token id of the token whose POLICIES cell names `policyName`
     * (base64, the form the per-token views take as the `tokenId` query
     * param). Run as SR from the /tokens grid.
     */
    storeTokenId(policyName) {
        this._tokenRow(policyName)
            .find('hedera-explorer', { timeout: 15000 })
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
        cy.get(L.gridRow, { timeout: 30000 }).first().as('accountRow');
        cy.get('@accountRow')
            .find(L.associateButton, { timeout: 30000 })
            .then(($button) => {
                const label = Cypress.$.trim($button.first().text());
                if (label === 'Associate') {
                    return cy.get('@accountRow').find(L.associateButton).first().click();
                }
                cy.log('Account is already associated');
            });
        this._waitForLabelFlip(() => cy.get(L.gridRow, { timeout: 20000 }), L.associateButton, 'Dissociate');
    }

    // Grants KYC to `username` in the run's token. Runs after associatePolicyToken
    // (the switch stays disabled while the account is not associated).
    grantKYC(policyName, username) {
        this.openTokensTab();
        this._tokenRow(policyName).find(L.tokenUsersIcon, { timeout: 15000 }).click();
        waitForPageReady(L.grid, 3);
        this._userRow(username)
            .find(L.kycButton, { timeout: 30000 })
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
        this._tokenRow(policyName).find(L.tokenUsersIcon, { timeout: 15000 }).click();
        waitForPageReady(L.grid, 3);
        // the balance cell renders only for an associated account; a missing cell
        // means the association state has not landed, so fail with a clear wait
        this._userRow(username)
            .find(L.balance, { timeout: 120000 })
            .should('exist');
        Checks.waitForBalanceIncrease(balance, username);
    }

    // ---- 09 tokens suite (token-management grid) ----

    createToken(name, published = false, nft = false, adminKey = true, wipeKey = true, freeze = false, KYC = false) {
        cy.get(L.legacy.createTokenBtn).click();
        cy.get(L.legacy.tokenNameInput).click();
        cy.get(L.legacy.tokenNameInput).clear();
        cy.get(L.legacy.tokenNameInput).type(name);
        if (published)
            {cy.get(L.legacy.publishedBtn).click();}
        if (nft) {
            cy.get(L.legacy.tokenTypeChoose).click();
            cy.contains('Non-Fungible').click();
        }
        if (!adminKey) {
            cy.get(L.legacy.adminKey).parent().find('switch-button').click();
        }
        if (!wipeKey) {
            cy.get(L.legacy.wipeKey).parent().find('switch-button').click();
        }
        if (freeze) {
            cy.get(L.legacy.freezeKey).parent().find('switch-button').click();
        }
        if (KYC) {
            cy.get(L.legacy.kycKey).parent().find('switch-button').click();
        }
        cy.get(L.legacy.createFinalBtn).click();
        Checks.waitForTaskComplete();
        Checks.waitForLoading();
        cy.contains(name).should('exist');
    }

    deleteToken(name) {
        cy.contains(new RegExp('^' + name + '$', 'g')).parent().find('[ng-reflect-src="/assets/images/icons/delete.sv"]').click();
        cy.get(L.legacy.tokenDeleteBtn).click();
        Checks.waitForTaskComplete();
        cy.contains(new RegExp('^' + name + '$', 'g')).should('not.exist');
    }

    deleteTokenDisabled(name) {
        cy.contains(new RegExp('^' + name + '$', 'g')).parent().find('[ng-reflect-src="/assets/images/icons/delete.sv"]').click();
        cy.get(L.legacy.tokenDeleteBtn).click();
        Checks.waitForTaskComplete();
        cy.contains(L.legacy.adminKeyIsntSet).should('exist');
        cy.contains(new RegExp('^' + name + '$', 'g')).should('exist');
    }

    editToken(name, editname, editSymbol) {
        cy.contains(name).parent().find(L.legacy.tokenEditBtn).click();
        cy.get(L.legacy.tokenNameInput).click();
        cy.get(L.legacy.tokenNameInput).clear();
        cy.get(L.legacy.tokenNameInput).type(editname);
        cy.get(L.legacy.tokenSymbolInput).click();
        cy.get(L.legacy.tokenSymbolInput).clear();
        cy.get(L.legacy.tokenSymbolInput).type(editSymbol);
        cy.contains(L.legacy.saveTokenBtn).click();
        cy.contains(editname).should('exist');
        cy.contains(name).parent().contains(editSymbol).should('exist');
    }

    editTokenDisabled(name) {
        cy.contains(name).parent().find(L.legacy.tokenEditBtnDisabled).should('exist');
    }

    addTag(name, tagName) {
        cy.contains(name).siblings().contains(L.legacy.createTagButton).click();
        cy.get(L.legacy.tagNameInput).type(tagName);
        cy.get(L.legacy.tagDescInput).type(tagName);
        cy.get(L.legacy.createButton).click();
        cy.contains(tagName).should('exist');
    }

    deleteTag(name, tagName) {
        cy.contains(name).siblings().contains(tagName).click();
        cy.get(L.legacy.deleteTagIcon).click();
        cy.get(L.legacy.closeWindowButton).click();
        cy.contains(tagName).should('not.exist');
    }
}
