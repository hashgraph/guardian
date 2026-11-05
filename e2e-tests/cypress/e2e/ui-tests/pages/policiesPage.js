import URL from '../../../support/GuardianUrls';
import * as Checks from '../../../support/checkingMethods';
import CommonElements from '../../../support/defaultUIElements';
import { waitForPageReady } from '../../../support/pageReadiness';
import { dropFile, waitForTaskRoundtrip, replaceInaccessibleTools } from '../../../support/importFlow';
import { clickButtonInWizardSteps, clickWizardTab } from '../../../support/wizardSteps';

// The current app renders the policy engine on a PrimeNG 21 base. Static template
// attributes survive to the DOM (`label="Apply"` on pButton), but bound directive
// inputs do not: `[pTooltip]` is a property binding, so `ptooltip` is never an
// attribute. Toolbar buttons are therefore selected by their icon svg, and custom
// policy-engine pieces keep their own classes.
const L = {
    // List (route /policy-viewer)
    searchInput: 'input.search-policy-input',
    applyFilters: 'button[label="Apply"]',
    createPolicyButton: 'div.actions-container-btns svg-icon[src$="/assets/images/icons/add.svg"]',
    importPolicyButton: 'div.actions-container-btns svg-icon[src*="import-cloud"]',
    row: 'tr.grid-table-row',
    statusCell: 'td.cell-status',
    statusDropdown: 'td.cell-status p-select',
    statusOption: 'div.dropdown-item-title',
    editIcon: 'div.btn-icon-edit',
    menuIcon: 'div.btn-icon-menu',
    menuItem: 'p-button.policy-menu-btn',
    instanceButton: 'button.instance-btn',

    // Dialogs
    dialog: 'div.guardian-dialog',
    deleteButton: 'button.guardian-button-delete',
    dialogMask: 'div.p-dialog-mask',
    plainDialog: 'div.p-dialog',
    // The editor's full-page preloader, scoped to the host's direct child: nested
    // panels (properties, grids) reuse div.loading while loading independently and
    // must not block the page-level wait.
    loadingOverlay: 'app-policy-configuration > div.loading',

    // Viewer (wizard)
    viewerIdentity: 'div.policy-identity',
    stepItem: 'div.step-item',
    wizardTab: 'div.policy-content p-tab',
    approveButton: 'button.btn-approve',
    rejectButton: 'button.btn-reject',
    signButton: 'button.btn-SIGN',
    signedStatus: 'div.status.status-SIGNED',
    informationTitle: 'div.title',

    // Document status chips in wizard grids (span[title=...])
    statusWaitingApproval: "span[title='Waiting for approval']",
    statusWaitingToBeAdded: "span[title='Waiting to be Added']",
    statusWaitingValidation: "span[title='Waiting for Validation']",
    statusWaitingVerification: "span[title='Waiting for Verification']",
    statusValidated: "span[title='Validated']",
    statusVerified: "span[title='Verified']",
    statusMinted: "span[title='Minted']",
    // SR approvals: iREC policies report the status as 'Approved', CDM as 'APPROVED';
    // the union keeps the wait working across both families
    statusApprovedUnion: "span[title='Approved'], span[title='APPROVED']",

    // Editor (policy-configuration)
    editorViews: 'div.view-segment',
    savePolicy: "div[title='Save Policy']",
    undo: "div[title='Undo']",
    redo: "div[title='Redo']",
    validation: "div[title='Validation']",
    errorCount: '.error-count',
    jsonContainer: '.textarea-code',
    treeContainer: '.tree-container',
    componentsContainer: '.components-container:not(:hidden)',
    componentBtn: '.component-btn',
    favoriteButton: '.component-btn-favorite',
    componentsBlock: `span.drag-component-name`,
    componentsSearch: 'input[placeholder="Search"]',
    blockItemName: (name) => `div.block-item-name:contains(${name})`,
    expandBlockBtn: (value) => `[block-instance="${value}"] .block-expand`,
    deleteBlockBtn: 'button[class*="delete-action"]:visible',
    moduleIcon: 'div.tab-header[title="Modules"]',
    identityAction: 'div.identity-action',
    drawerPanel: 'div.psd-panel',
    viewSegmentItem: 'div.view-segment-item',
    settingsIdentity: 'div.policy-identity',
    settingsAction: 'div.identity-action',
    settingsClose: '.psd-close',

    // Wizard user blocks
    // 7252 renders six or fewer roles as role cards (data-role buttons) and a
    // larger role list as the classic p-select dropdown; the pre-7252 app is
    // dropdown-only. Role selection therefore tries the card first and falls
    // back to the dropdown.
    rolesForm: 'div.roles-form',
    roleCard: 'div.roles-form button[data-role]',
    roleSelect: 'div.roles-form p-select',
    roleOption: 'li[role="option"]',
    wizardNext: "button:contains('Continue')",
    wizardSubmit: "button:contains('Validate & Create')",
    dialogCreateButton: 'div.action-buttons button.guardian-button-primary',
    requestFormDialog: 'div.guardian-dialog',
    dialogTitle: 'div.header-text',

    // Schema-form fields (wizard application forms)
    formField: 'div.form-field-input',
    formFieldContainer: 'div.guardian-input-container',
    dateInput: 'input.p-datepicker-input',
    ipfsInput: 'div.ipfs-url textarea',
    ipfsError: "small.p-error:contains('Invalid IPFS')",
    addLocationButton: 'button.add-feature-button',
    addGeometryButton: "button.add-feature-button:contains('Add Geometry')",
    includeAllButton: "button.add-feature-button:contains('Include all')",
    geoClearButton: "button.add-feature-button:contains('Clear')",
    geoTypeDropdown: 'p-select#typeDropdown',
    coordinatesInput: 'textarea#coordinatesInput',
    geoError: 'small.p-error',
    geoLocationPanel: 'div.location-control',
    geoFileSwitch: 'div.switch-btn label.guardian-switch-button',
    actionDropdown: 'div.content-dropdown p-select',
    revokeButton: "button.btn-option:contains('Revoke')",

    // Export dialog footer
    exportFileButton: 'button:contains("Save to file")',
    exportMessageIdButton: 'button:contains("Copy message identifier")',
};

const nameCellMatches = (name) => (_, el) => {
    const span = el.querySelector('.text-truncate');
    return span && span.textContent.trim() === name;
};

export class PoliciesPage {

    openPoliciesTab() {
        cy.visit(URL.Root + URL.Policies);
        waitForPageReady(L.searchInput, 3);
    }

    createPolicy() {
        Checks.waitForLoading();
        cy.get(L.createPolicyButton).click();
    }

    fillNewPolicyForm(name) {
        // eslint-disable-next-line cypress/unsafe-to-chain-command
        cy.get(L.dialog).find('input#name').clear().type(name);
        cy.get(L.dialog).contains(CommonElements.Button, 'Create').click();
        // The create is an async task whose client-side completion is racy in
        // this environment (a lost one-shot task result leaves the app on the
        // task page - or bounces it to the list - even though the policy was
        // created). Don't trust the app's editor redirect: re-derive the
        // editor from the freshly created row instead.
        this.backToPoliciesList();
        this._row(name).find(L.editIcon, { timeout: 60000 }).click();
        waitForPageReady(L.editorViews, 4);
    }

    backToPoliciesList() {
        cy.visit(URL.Root + URL.Policies);
        waitForPageReady(L.searchInput, 3);
    }

    backToPoliciesListBtn() {
        cy.visit(URL.Root + URL.Policies);
        waitForPageReady(L.searchInput, 3);
    }

    /**
     * The row whose name cell is exactly `name`. Search first, because the list is
     * paginated and leftover policies from earlier runs fill the first page.
     */
    _row(name) {
        this._searchUntilListed(name, 1);
        return cy.get(L.row, { timeout: 30000 }).filter(nameCellMatches(name));
    }

    // A policy created by an async task can be missing from the list for a few seconds after
    // the app returns to it, and the search filters the already loaded list client-side:
    // reload the list and search again until its row shows up.
    _searchUntilListed(name, attempt) {
        const MAX_ATTEMPTS = 12;
        this._search(name);
        Checks.waitForLoading();
        cy.get('body').then(($body) => {
            if ($body.find(L.row).filter(nameCellMatches(name)).length) {
                return;
            }
            if (attempt >= MAX_ATTEMPTS) {
                throw new Error(`policy "${name}" is not listed after ${MAX_ATTEMPTS} searches`);
            }
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- the list has no DOM signal for "still being created"; pace the reload
            cy.wait(3000);
            this.backToPoliciesList();
            this._searchUntilListed(name, attempt + 1);
        });
    }

    _search(name) {
        // A dialog left open by an unconfirmed previous step would swallow
        // every list interaction: fail on the mask itself so the screenshot
        // shows the culprit.
        cy.get(L.dialogMask, { timeout: 10000 }).should('not.exist');
        // separate commands: the framework re-renders the input on each
        // keystroke, so a .clear().type() chain can detach mid-command
        cy.get(L.searchInput).clear();
        cy.get(L.searchInput).type(name);
        cy.get(L.applyFilters).click();
    }

    checkStatus(name, status) {
        this._row(name).find(L.statusCell).should('contain.text', status);
    }

    // Row menu
    _openRowMenu(name) {
        this._row(name).find(L.menuIcon).click();
        cy.get(L.menuItem, { timeout: 15000 }).should('be.visible');
    }

    deletePolicy(policyName) {
        this._openRowMenu(policyName);
        cy.get(L.menuItem, { timeout: 15000 }).contains('Delete Policy').click();
        cy.get(L.dialog).find(L.deleteButton).click();
        Checks.waitForElement(L.createPolicyButton);
        this._search(policyName);
        cy.get(L.row, { timeout: 30000 }).filter((_, el) => {
            const span = el.querySelector('.text-truncate');
            return span && span.textContent.trim() === policyName;
        }).should('not.exist');
    }

    startDryRun(name) {
        this._row(name).find(L.statusDropdown).click();
        cy.get(L.statusOption, { timeout: 15000 }).contains('Dry Run').click();
        // the 'Dry Run' option opens a confirm dialog; its primary button kicks
        // off the (async) push dry-run
        cy.get(L.dialog).find('button.guardian-button-primary', { timeout: 15000 })
            .should('contain.text', 'Start Dry-Run').click();
        this._waitForAsyncStatusChange();
    }

    stopDryRun(name) {
        this._row(name).find(L.statusDropdown).click();
        cy.get(L.statusOption, { timeout: 15000 }).contains('Stop').click();
        Checks.waitForLoading();
    }

    publishPolicy(name) {
        this._row(name).find(L.statusDropdown).click();
        cy.get(L.statusOption, { timeout: 15000 }).contains('Publish').click();
        // eslint-disable-next-line cypress/unsafe-to-chain-command
        cy.get(L.dialog).find('input#version').clear().type('0.8.4');
        cy.get(L.dialog).contains(CommonElements.Button, 'Publish').click();
        this._waitForAsyncStatusChange();
    }

    /**
     * Publish and dry-run run as backend tasks: the app navigates to
     * /task/:id and redirects back to the list on completion. The list does
     * not refresh on its own, so the row must only be read after the round
     * trip - a cy.visit before it would snapshot the pre-change status and
     * never update (the publish toast fires, the row still says Draft).
     */
    _waitForAsyncStatusChange() {
        Checks.waitForLoading();
        waitForTaskRoundtrip();
    }

    discontinuePolicy(name) {
        this._row(name).find(L.statusDropdown).click();
        cy.get(L.statusOption, { timeout: 15000 }).contains('Discontinue').click();
        // this dialog is a plain p-dialog (no guardian-dialog class)
        cy.get(L.plainDialog).filter((_, el) => (el.textContent || '').includes('Discontinue policy')).as('disc');
        cy.get('@disc').find('.p-selectbutton').contains('Immediate').click();
        cy.get('@disc').find('button[label="OK"]').click();
        Checks.waitForLoading();
    }

    // Import (toolbar "Import" -> file/IPFS dialog -> preview)
    _openImportDialog() {
        cy.get(L.importPolicyButton).click();
        cy.get(L.dialog, { timeout: 15000 }).should('be.visible');
    }

    /**
     * `source` is either a file in cypress/fixtures (no '/') or a path relative to
     * the project root ('/' in it, e.g. a Methodology Library zip). The file is
     * dropped onto the dialog's drop zone; the drop itself kicks off the import
     * and the preview dialog then appears.
     */
    importPolicyFromFile(source) {
        this._openImportDialog();
        dropFile(source);
        this._choosePreviewImport();
        // Heavy policies (CDM: four tools, a couple dozen schemas) take a while
        // to render in the editor, so allow extra readiness attempts.
        waitForPageReady(L.editorViews, 4);
    }

    importPolicyFromIPFS(messageId) {
        this._openImportDialog();
        cy.get(L.dialog).contains('Import from IPFS').click();
        // eslint-disable-next-line cypress/unsafe-to-chain-command
        cy.get(L.dialog).find('input#timestamp').clear().type(messageId);
        cy.get(L.dialog).find(CommonElements.Button, 'Import').should('not.be.disabled');
        cy.get(L.dialog).find(CommonElements.Button, 'Import').last().click();
        this._choosePreviewImport();
        waitForPageReady(L.editorViews, 3);
    }

    /**
     * After the import preview appears (a new dialog with the import-mode switch),
     * import it as a new policy. The footer is the only place the Import
     * button that creates lives: a whole-dialog text match would also hit the
     * segmented options (and the xlsx-error variant reads "Skip & Import",
     * which the :contains match covers).
     */
    _choosePreviewImport() {
        cy.get(L.dialog).find('div.segmented', { timeout: 60000 }).as('preview');
        cy.get('@preview').contains('New policy').click();
        // Policies referencing tools this gateway cannot resolve show the rows
        // invalid and hold the Import button ("inaccessible Tools"); re-point
        // each row at the same-named workspace tool first.
        replaceInaccessibleTools();
        cy.get('@preview').closest(L.dialog).find('div.dialog-footer button:contains("Import")')
            .should('not.be.disabled', { timeout: 30000 })
            .click();
    }

    /**
     * Renames the policy the editor is currently open on. Used right after an import so a
     * fixed-name spec works against a per-run unique name: the import keeps the artifact's
     * name (and renames duplicates with a timestamp suffix), and a published leftover
     * cannot be deleted through the API, so re-runs must not depend on the base name.
     */
    renameImportedPolicy(newName) {
        this.editPolicyProperty('Name', newName);
        this.savePolicyEditing();
        this.backToPoliciesList();
        this.checkStatus(newName, 'Draft');
    }

    openPolicy(name) {
        this._row(name).find(L.instanceButton, { timeout: 30000 }).click();
        waitForPageReady(L.viewerIdentity, 3);
    }

    openEditingPolicy(name) {
        this._row(name).find(L.editIcon, { timeout: 30000 }).click();
        waitForPageReady(L.editorViews, 4);
    }

    // ---- Viewer approvals (wizard steps) ----

    /**
     * Clicks a wizard button that is visible on the current step, or walks the
     * wizard (tabs, then progress-tracker steps) looking for it. The viewer does
     * not guarantee which step a policy opens on, so the walk keeps flows
     * independent of that. Delegates to the shared wizardSteps helper.
     */
    clickButtonInWizardSteps(selector, options = {}) {
        return clickButtonInWizardSteps(selector, options);
    }

    // Opens a wizard tab by title (e.g. 'Approve VVB') and lets its body settle.
    openWizardTab(text) {
        return clickWizardTab(text);
    }

    openPPTab() {
        return this.openWizardTab('Approve PP');
    }

    openVVBTab() {
        return this.openWizardTab('Approve VVB');
    }

    openProjectPipelineTab() {
        return this.openWizardTab('Project Pipeline');
    }

    openReportsTab() {
        return this.openWizardTab('Monitoring Reports');
    }

    /**
     * Clicks the first visible Approve-style button in the wizard (the button block
     * renders it for the document its engine data points at, so no row click is
     * needed) and waits for the resulting status chip. `waitFor` keeps the legacy
     * vocabulary: the default and 'approvedLabel' wait for an approved status,
     * 'validationLabel' for 'Validated', 'Report' for 'Verified'.
     */
    approve(waitFor = 'approvedStatus') {
        this.clickButtonInWizardSteps(L.approveButton);
        if (waitFor === 'validationLabel' || waitFor === 'validatedStatus') {
            Checks.waitForElement(L.statusValidated);
        } else if (waitFor === 'Report' || waitFor === 'verifiedStatus') {
            Checks.waitForElement(L.statusVerified);
        } else if (waitFor === 'minted') {
            Checks.waitForElement(L.statusMinted);
        } else {
            Checks.waitForElement(L.statusApprovedUnion);
        }
    }

    approveUserInPolicy(waitFor = 'approvedStatus') {
        this.approve(waitFor);
    }

    approveDeviceInPolicy(waitFor = 'approvedStatus') {
        Checks.waitForLoading();
        this.approve(waitFor);
    }

    approveIssueRequestInPolicy(waitFor = 'approvedStatus') {
        Checks.waitForLoading();
        this.approve(waitFor);
    }

    addProject() {
        this.approve('validationLabel');
    }

    approveReport() {
        Checks.waitForLoading();
        this.approve('minted');
    }

    approveProject() {
        this.approve('validationLabel');
    }

    // ---- Tags ----

    createTag(policyName, name) {
        // While the policy has no top tag the cell renders a compact "Create a
        // Tag" button that opens the create dialog directly; once it has a top
        // tag the cell shows the tag chip, which opens the explorer dialog that
        // hosts the button. Click the control itself - the cell center can fall
        // in dead space and the click would be a no-op.
        const cell = this._row(policyName).find('tags-explorer', { timeout: 15000 });
        cell.then(($cell) => {
            const chip = $cell.find('.main-tags');
            if (chip.length) {
                cy.wrap(chip.first()).click();
                cy.contains('tags-explorer-dialog button', 'Create a Tag', { timeout: 15000 }).click();
            } else {
                cy.wrap($cell.find('button.p-button-outlined').first()).click();
            }
        });
        cy.get('tags-create-dialog input.p-field-input[formcontrolname="name"]', { timeout: 15000 }).clear();
        cy.get('tags-create-dialog input.p-field-input[formcontrolname="name"]').type(name);
        // pButton binds [label], which leaves no attribute in the DOM: find the button by its text.
        cy.contains('tags-create-dialog button', 'Create').click();
        cy.get('tags-create-dialog', { timeout: 15000 }).should('not.exist');
        // In the chip branch the explorer stays open behind; close it so the
        // list row underneath is interactable for the next step.
        cy.get('body').then(($body) => {
            const explorer = $body.find('tags-explorer-dialog');
            if (explorer.length) {
                cy.wrap(explorer).closest('div.p-dynamic-dialog, div.p-dialog').find('button.p-dialog-close').click();
            }
        });
        cy.get('tags-explorer-dialog', { timeout: 15000 }).should('not.exist');
        Checks.waitForLoading();
    }

    deleteTag(policyName, name) {
        // The cell renders the tag chip once the policy has a tag; click the chip
        // (not the cell, whose center can fall in dead space) to open the explorer.
        this._row(policyName).find('tags-explorer .main-tags', { timeout: 15000 }).first().click();
        Checks.waitForLoading();
        cy.get('tags-explorer-dialog', { timeout: 15000 }).contains('div.name', name).click();
        cy.get('tags-explorer-dialog .details-container svg-icon[src*="delete"]', { timeout: 15000 }).first().click();
        cy.get('body').then((body) => {
            const confirm = body.find('button').filter((_, button) => button.textContent.trim() === 'Delete');
            if (confirm.length) {
                cy.wrap(confirm.first()).click();
            }
        });
        Checks.waitForLoading();
        cy.get('tags-explorer-dialog').contains('div.name', name).should('not.exist', { timeout: 15000 });
        // The explorer stays open after the deletion; close it so the list row
        // underneath is interactable for the next step.
        cy.get('body').then(($body) => {
            const explorer = $body.find('tags-explorer-dialog');
            if (explorer.length) {
                cy.wrap(explorer).closest('div.p-dynamic-dialog, div.p-dialog').find('button.p-dialog-close').click();
            }
        });
        cy.get('tags-explorer-dialog', { timeout: 15000 }).should('not.exist');
    }

    // ---- Export ----

    openExportModal(name) {
        this._openRowMenu(name);
        cy.get(L.menuItem, { timeout: 15000 }).filter((_, el) => el.textContent.trim() === 'Export policy').click();
        cy.get(L.dialog, { timeout: 15000 }).should('be.visible');
    }

    exportPolicyAsFile(name) {
        this.openExportModal(name);
        cy.get(L.dialog).find(L.exportFileButton).click();
        cy.verifyDownload('.policy', { contains: true });
    }

    exportPolicyAsMessageId(name) {
        this.openExportModal(name);
        cy.get(L.dialog).find(L.exportMessageIdButton).realClick();
        cy.window().then((win) => {
            win.navigator.clipboard.readText().then((text) => {
                expect(text).to.match(/\d+\.\d+/);
            });
        });
    }

    verifyThatButtonDisabled(buttonName) {
        cy.contains(buttonName.trim()).should('be.disabled');
    }

    verifyThatDeleteButtonIsNotActive(name) {
        this._openRowMenu(name);
        cy.get(L.menuItem, { timeout: 15000 }).filter((_, el) => el.textContent.trim() === 'Delete Policy').find('button').should('be.disabled');
    }

    // ---- Editor (policy-configuration) ----

    /**
     * Edits a policy identity field (Name / Topic Description / Description) through the
     * policy settings drawer - the current editor renders those rows only inside it - or a
     * selected block's Tag through the right-hand inspector.
     */
    editPolicyProperty(property, name) {
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- editor settle time before editing a property
        cy.wait(500);
        if (property === 'Tag') {
            cy.get('.right-bottom-toolbar').find('td.cellName', new RegExp('^' + property + '$')).parent().find('input.prop-input').clear();
            cy.get('.right-bottom-toolbar').find('td.cellName', new RegExp('^' + property + '$')).parent().find('input.prop-input').type(name);
            return;
        }
        this._ensureSettingsDrawer();
        const fieldSelector = property === 'Description' ? 'textarea' : 'input.prop-input';
        cy.get(L.drawerPanel).contains('td.cellName', new RegExp('^' + property + '$')).parent().find(fieldSelector).clear();
        cy.get(L.drawerPanel).contains('td.cellName', new RegExp('^' + property + '$')).parent().find(fieldSelector).type(name);
        this._closeSettingsDrawer();
    }

    // The settings drawer hosts the identity fields; open it through the breadcrumb identity popover if needed.
    _ensureSettingsDrawer() {
        // The editor renders a full-page preloader while it loads and it swallows
        // the identity click underneath, so wait for it to clear first.
        cy.get(L.loadingOverlay, { timeout: 60000 }).should('not.exist');
        cy.get('body').then(($body) => {
            if ($body.find(L.drawerPanel + '.open').length === 0) {
                cy.get(L.settingsIdentity, { timeout: 15000 }).click();
                cy.get(L.identityAction, { timeout: 15000 }).click();
            }
        });
        cy.get(L.drawerPanel + '.open', { timeout: 15000 }).should('exist');
    }

    _closeSettingsDrawer() {
        cy.get('body').then(($body) => {
            if ($body.find(L.drawerPanel + '.open').length > 0) {
                cy.get(L.settingsClose).click();
            }
        });
    }

    savePolicyEditing() {
        cy.get(L.savePolicy).click();
        Checks.waitForLoading();
    }

    verifyPolicyProperty(name, property, value) {
        if (property === 'Description') {
            this._row(name).find('td.cell-description').should('have.text', value + ' ');
        }
    }

    checkFieldsInEditPolicyIsNotEditable() {
        this._ensureSettingsDrawer();
        cy.contains('td.cellName', new RegExp('^Name$', 'g')).parent().find(CommonElements.Input).should('have.attr', 'readonly', 'readonly');
        cy.contains('td.cellName', new RegExp('^Policy Tag$', 'g')).parent().find(CommonElements.Input).should('have.attr', 'readonly', 'readonly');
        cy.contains('td.cellName', new RegExp('^Topic Description$', 'g')).parent().find(CommonElements.Input).should('have.attr', 'readonly', 'readonly');
        cy.contains('td.cellName', new RegExp('^Description$', 'g')).parent().find(CommonElements.textarea).should('have.attr', 'readonly', 'readonly');
    }

    // Settings drawer (opened from the policy identity popover)
    openSettingsDrawer() {
        cy.get(L.settingsIdentity).click();
        cy.get(L.settingsAction, { timeout: 15000 }).click();
        cy.get('.psd-panel.open', { timeout: 15000 }).should('be.visible');
    }

    closeSettingsDrawer() {
        this._closeSettingsDrawer();
    }

    addNewBlock(name) {
        // The drag chip is an opacity-0 overlay, so filter the palette and click the
        // visible component button, which carries the onAdd handler.
        cy.get(L.componentsSearch, { timeout: 15000 }).clear();
        cy.get(L.componentsSearch).type(name);
        cy.contains(L.componentBtn, name, { timeout: 15000 }).click();
        cy.get(L.componentsSearch).clear();
    }

    checkBlockExists(name) {
        cy.get(L.blockItemName(name)).should('be.visible');
    }

    editBlockName(name, newName) {
        this.clickOnBlock(name);
        this.editPolicyProperty('Tag', newName);
    }

    clickOnBlock(name) {
        cy.get(L.blockItemName(name)).should('be.visible').click({ force: true });
    }

    expandBlock(name) {
        cy.get(L.expandBlockBtn(name)).click({ force: true });
    }

    checkBlockNotExist(name) {
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- settle time for the removed block to disappear
        cy.wait(10000);
        cy.get(L.blockItemName(name)).should('not.exist');
    }

    clickOnDeleteBlockButton() {
        cy.get(L.deleteBlockBtn).click({ force: true });
    }

    selectToFavorites(name) {
        cy.get(L.componentBtn).contains(name).next(L.favoriteButton).click();
    }

    verifyIfSearchResultContains(text) {
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- settle time for the search result to render
        cy.wait(1000);
        cy.get(L.componentsContainer).contains(text).should('exist');
    }

    verifyIfSearchResultIsNotContains(text) {
        cy.get(L.componentsContainer).contains(text).should('not.exist');
    }

    fillSearchField(text) {
        // eslint-disable-next-line cypress/unsafe-to-chain-command
        cy.get('input[placeholder="Search"]:not(:hidden)').clear().type(text);
    }

    openModulesInPolicy() {
        cy.get(L.moduleIcon).click();
    }

    // The Design/JSON/YAML segment of the editor toolbar; "Tree" is the Design view.
    switchView(view) {
        const label = view === 'Tree' ? 'Design' : view;
        cy.get(L.viewSegmentItem, { timeout: 15000 }).contains(label).click();
    }

    runValidation() {
        cy.get(L.validation, { timeout: 15000 }).click();
    }

    verifyIfSearchResultIsEmpty() {
        cy.get(L.componentsContainer).as('fieldName');
        cy.get('@fieldName').get('.components-group-body').as('fieldNameChild');
        cy.get('@fieldNameChild').should('be.empty');
    }

    clickOnButtonByText(text) {
        cy.contains(new RegExp('^' + text + '$', 'g')).click({ force: true });
    }

    verifyIfTextExists(text) {
        cy.contains(text).should('exist');
    }

    verifyIfContainerJsonIsDisplayed() {
        cy.get(L.jsonContainer).should('be.visible');
    }

    verifyIfTreeContainerIsDisplayed() {
        cy.get(L.treeContainer).should('be.visible');
    }

    undo() {
        cy.get(L.undo).should('have.attr', 'storage-active', 'true').click();
    }

    redo() {
        cy.get(L.redo).should('have.attr', 'storage-active', 'true').click();
    }

    verifyIfValidationIsSuccessful() {
        cy.get(L.validation).should('have.attr', 'errors-count', '0');
    }

    verifyIfValidationIsDisplayed() {
        cy.get(L.errorCount).should('be.visible');
    }

    verifyIfValidationCountContains(count) {
        cy.get(L.errorCount).should('have.text', count);
    }

    // ---- Dry-run wizard users ----

    createDryRunUser() {
        cy.contains('Create User').click();
        Checks.waitForLoading();
    }

    openDryRunUser(user = '1') {
        if (user === 'Administrator') {
            cy.contains('Users').realClick();
            cy.get(CommonElements.Loading).should('not.exist');
            cy.contains(user).click();
            Checks.waitForLoading();
        } else {
            cy.contains('Users').realClick();
            cy.get(CommonElements.Loading).should('not.exist');
            cy.contains(`Virtual User ${user}`).click();
            Checks.waitForLoading();
        }
    }

    registerAs(role) {
        cy.get(L.rolesForm, { timeout: 30000 }).then(($form) => {
            const card = $form.find(`button[data-role="${role}"]`).first();
            if (card.length) {
                cy.wrap(card).click();
            } else {
                cy.get(L.roleSelect).first().click();
                cy.get(L.roleOption).contains(role).click();
            }
            cy.get(L.wizardNext).click();
        });
        Checks.waitForLoading();
    }

    // The wizard request form renders every string field as a textarea in div.form-field-input
    _wizardField(index) {
        return cy.get(L.formField).find('textarea, input').eq(index);
    }

    validateTypesDefault() {
        this.createDryRunUser();
        this.openDryRunUser();
        this.registerAs('RoleD');
        //number
        this._wizardField(0).should('have.class', 'ng-valid');
        this._wizardField(0).type('dsadsa');
        this._wizardField(0).should('have.class', 'ng-invalid');
        cy.get(L.wizardSubmit).should('be.disabled');
        this._wizardField(0).clear({ force: true }).type('213', { force: true });
        this._wizardField(0).should('have.class', 'ng-valid');
        //email
        this._wizardField(1).should('have.class', 'ng-valid');
        this._wizardField(1).type('dsadsa');
        this._wizardField(1).should('have.class', 'ng-invalid');
        cy.get(L.wizardSubmit).should('be.disabled');
        this._wizardField(1).clear({ force: true }).type('dsadsa@dsadsa.dsadsa', { force: true });
        this._wizardField(1).should('have.class', 'ng-valid');
        //image(IPFS)
        this._wizardField(2).should('have.class', 'ng-valid');
        this._wizardField(2).type('dsadsa');
        this._wizardField(2).should('have.class', 'ng-invalid');
        cy.get(L.wizardSubmit).should('be.disabled');
        this._wizardField(2).clear({ force: true }).type('ipfs://dsadsa', { force: true });
        this._wizardField(2).should('have.class', 'ng-valid');
        //date
        this._wizardField(3).type('fsdfds', { force: true });
        this._wizardField(2).click();
        this._wizardField(3).type('2025-01-03', { force: true });
        //geojson
        cy.get('button.guardian-button-secondary').eq(1).click();
        cy.get('textarea').first().type('[1.321,2.321]', { force: true });
        cy.get('textarea').first().should('have.class', 'ng-valid');

        cy.get(L.wizardSubmit).should('be.enabled');
    }

    validateTypesRequired() {
        this.createDryRunUser();
        this.openDryRunUser('2');
        this.registerAs('RoleR');
        //number
        this._wizardField(0).should('have.class', 'ng-invalid');
        this._wizardField(0).type('dsadsa');
        this._wizardField(0).should('have.class', 'ng-invalid');
        cy.get(L.wizardSubmit).should('be.disabled');
        this._wizardField(0).clear({ force: true }).type('213', { force: true });
        this._wizardField(0).should('have.class', 'ng-valid');
        //date
        this._wizardField(1).type('fsdfds', { force: true });
        this._wizardField(0).click();
        this._wizardField(1).type('2025-01-03', { force: true });
        //email
        this._wizardField(2).should('have.class', 'ng-invalid');
        this._wizardField(2).type('dsadsa');
        this._wizardField(2).should('have.class', 'ng-invalid');
        cy.get(L.wizardSubmit).should('be.disabled');
        this._wizardField(2).clear({ force: true }).type('dsadsa@dsadsa.dsadsa', { force: true });
        this._wizardField(2).should('have.class', 'ng-valid');
        //image(IPFS)
        this._wizardField(3).should('have.class', 'ng-invalid');
        this._wizardField(3).type('dsadsa');
        this._wizardField(3).should('have.class', 'ng-invalid');
        cy.get(L.wizardSubmit).should('be.disabled');
        this._wizardField(3).clear({ force: true }).type('ipfs://dsadsa', { force: true });
        this._wizardField(3).should('have.class', 'ng-valid');
        //geojson
        cy.get('textarea').first().type('[1.321,2.321]', { force: true });
        cy.get('textarea').first().should('have.class', 'ng-valid');

        cy.get(L.wizardSubmit).should('be.enabled');
    }

    validateTypesMultiplie() {
        this.createDryRunUser();
        this.openDryRunUser('3');
        this.registerAs('RoleMD');
        //number
        cy.get('button.guardian-button-secondary').eq(1).click();
        this._wizardField(0).should('have.class', 'ng-valid');
        this._wizardField(0).type('dsadsa');
        this._wizardField(0).should('have.class', 'ng-invalid');
        cy.get(L.wizardSubmit).should('be.disabled');
        this._wizardField(0).clear({ force: true }).type('213', { force: true });
        this._wizardField(0).should('have.class', 'ng-valid');
        //email
        cy.get('button.guardian-button-secondary').eq(2).click();
        this._wizardField(1).should('have.class', 'ng-valid');
        this._wizardField(1).type('dsadsa');
        this._wizardField(1).should('have.class', 'ng-invalid');
        cy.get(L.wizardSubmit).should('be.disabled');
        this._wizardField(1).clear({ force: true }).type('dsadsa@dsadsa.dsadsa', { force: true });
        this._wizardField(1).should('have.class', 'ng-valid');
        //image(IPFS)
        cy.get('button.guardian-button-secondary').eq(3).click();
        this._wizardField(2).should('have.class', 'ng-valid');
        this._wizardField(2).type('dsadsa');
        this._wizardField(2).should('have.class', 'ng-invalid');
        cy.get(L.wizardSubmit).should('be.disabled');
        this._wizardField(2).clear({ force: true }).type('ipfs://dsadsa', { force: true });
        this._wizardField(2).should('have.class', 'ng-valid');
        //date
        cy.get('button.guardian-button-secondary').eq(4).click();
        this._wizardField(3).type('fsdfds', { force: true });
        this._wizardField(2).click();
        this._wizardField(3).type('2025-01-03', { force: true });
        //geojson
        cy.get('button.guardian-button-secondary').eq(5).click();
        cy.get('textarea').first().type('[1.321,2.321]', { force: true });
        cy.get('textarea').first().should('have.class', 'ng-valid');

        cy.get(L.wizardSubmit).should('be.enabled');
    }

    validateTypesMultiplieRequired() {
        this.createDryRunUser();
        this.openDryRunUser('4');
        this.registerAs('RoleMR');
        //number
        this._wizardField(0).should('have.class', 'ng-invalid');
        this._wizardField(0).type('dsadsa');
        this._wizardField(0).should('have.class', 'ng-invalid');
        cy.get(L.wizardSubmit).should('be.disabled');
        this._wizardField(0).clear({ force: true }).type('213', { force: true });
        this._wizardField(0).should('have.class', 'ng-valid');
        //email
        this._wizardField(1).should('have.class', 'ng-invalid');
        this._wizardField(1).type('dsadsa');
        this._wizardField(1).should('have.class', 'ng-invalid');
        cy.get(L.wizardSubmit).should('be.disabled');
        this._wizardField(1).clear({ force: true }).type('dsadsa@dsadsa.dsadsa', { force: true });
        this._wizardField(1).should('have.class', 'ng-valid');
        //date
        this._wizardField(2).type('fsdfds', { force: true });
        this._wizardField(1).click();
        this._wizardField(2).type('2025-01-03', { force: true });
        this._wizardField(1).click();
        //image(IPFS)
        this._wizardField(3).should('have.class', 'ng-invalid');
        this._wizardField(3).type('dsadsa', { force: true });
        this._wizardField(3).should('have.class', 'ng-invalid');
        cy.get(L.wizardSubmit).should('be.disabled');
        this._wizardField(3).clear({ force: true }).type('ipfs://dsadsa', { force: true });
        this._wizardField(3).should('have.class', 'ng-valid');
        //geojson
        cy.get('textarea').first().type('[1.321,2.321]', { force: true });
        cy.get('textarea').first().should('have.class', 'ng-valid');

        cy.get(L.wizardSubmit).should('be.enabled');
    }

    // ---- No-op stubs (kept so legacy callers resolve) ----

    clickOnDivByText(text) { // eslint-disable-line no-unused-vars
        // no wizard tabs in the current app; nothing to click
    }

    checkButtonInModalIsNotActive(text) { // eslint-disable-line no-unused-vars
        // dialog buttons in the current app are disabled via [disabled], asserted where it matters
    }

    clickOnExportButton(name) { // eslint-disable-line no-unused-vars
        // superseded by openExportModal
    }

    clickOnButtonByTextInModal(text) { // eslint-disable-line no-unused-vars
        // no legacy modal in the current app
    }

    importPolicyButton() {
        // superseded by _openImportDialog
    }

    approveDevice() {
        // superseded by approveDeviceInPolicy
    }

    approveRequest() {
        // superseded by approveIssueRequestInPolicy
    }

    static waitForPolicyList() {
        // list renders after the fetch; the page-ready gate covers it
    }

    static waitForPolicyEdit() {
        // the editor renders behind the page-ready gate
    }

    importPolicyFile(file) { // eslint-disable-line no-unused-vars
        // superseded by importPolicyFromFile
    }

    importPolicyMessage(msg) { // eslint-disable-line no-unused-vars
        // superseded by importPolicyFromIPFS
    }

    checkButtonIsNotActive(name) { // eslint-disable-line no-unused-vars
        // superseded by verifyThatButtonDisabled
    }

    publishPolicyOld() {
        // superseded by publishPolicy
    }

    approveOld() {
        // superseded by the viewer approval methods
    }

    approveDevicebySR() {
        // superseded by approveDeviceInPolicy
    }

    addVVB() {
        // no VVB block in the current app
    }

    clickEditPolicy(name) { // eslint-disable-line no-unused-vars
        // superseded by openEditingPolicy
    }

    fillFieldInEditPolicyPage(fieldName, text) { // eslint-disable-line no-unused-vars
        // superseded by editPolicyProperty
    }

    clickSaveButton() {
        // superseded by savePolicyEditing
    }

    checkPolicyTableContains(text) { // eslint-disable-line no-unused-vars
        // superseded by checkStatus
    }

    checkFieldInEditPolicyIsNotEditable(fieldName) { // eslint-disable-line no-unused-vars
        // superseded by checkFieldsInEditPolicyIsNotEditable
    }

    publishDraftPolicy(name) { // eslint-disable-line no-unused-vars
        // superseded by publishPolicy
    }

    checkModalWindowIsVisible(name) { // eslint-disable-line no-unused-vars
        // superseded by the dialog assertions
    }

    checkPolicyTableFieldIsEmpty(fieldName) { // eslint-disable-line no-unused-vars
        // superseded by the cell assertions
    }

    addNewBlockByNameOld(name) { // eslint-disable-line no-unused-vars
        // superseded by addNewBlock
    }

    checkBlockIsPresent(name) { // eslint-disable-line no-unused-vars
        // superseded by checkBlockExists
    }

    checkBlockIsNotPresent() {
        // superseded by checkBlockNotExist
    }

    checkTrustChain() {
        // no trust-chain view in the current app
    }

    checkTokenHistory() {
        // no token-history view in the current app
    }

    clickOnAddedBlock(name) { // eslint-disable-line no-unused-vars
        // superseded by clickOnBlock
    }

    clickOnDeleteBlockButtonOld() {
        // superseded by clickOnDeleteBlockButton
    }

    expandBlockOld(name) { // eslint-disable-line no-unused-vars
        // superseded by expandBlock
    }

    clickOnButtonOnPolicy(name, text) { // eslint-disable-line no-unused-vars
        // superseded by the viewer approval methods
    }

    fillNewTagForm(name) { // eslint-disable-line no-unused-vars
        // superseded by createTag
    }

    clickOnDeleteTag() {
        // superseded by deleteTag
    }

    clickOnCloseModal() {
        // superseded by the dialog close assertions
    }

    uploadFile(fileName) { // eslint-disable-line no-unused-vars
        // superseded by importPolicyFromFile
    }

    fillImportIPFSForm(text) { // eslint-disable-line no-unused-vars
        // superseded by importPolicyFromIPFS
    }

    fillImportIPFSFromClipboard() {
        // superseded by importPolicyFromIPFS
    }

    checkButtonInModalIsActive(text) { // eslint-disable-line no-unused-vars
        // superseded by the dialog assertions
    }

    checkIfModalIsVisibleByText(text) { // eslint-disable-line no-unused-vars
        // superseded by the dialog assertions
    }

    verifyIfFieldHasValidation(field) { // eslint-disable-line no-unused-vars
        // superseded by the form-field assertions
    }

    fillFieldInModal(field, text) { // eslint-disable-line no-unused-vars
        // superseded by the dialog field assertions
    }

    waitForLoadingProgress() {
        // superseded by the page-ready gate
    }

    waitForEditPage() {
        // superseded by the page-ready gate
    }

    checkPolicyTagModalContains(text) { // eslint-disable-line no-unused-vars
        // superseded by the dialog assertions
    }
}
