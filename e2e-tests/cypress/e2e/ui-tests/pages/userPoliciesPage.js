import * as Checks from '../../../support/checkingMethods';
import { clickButtonInWizardSteps, clickWizardTab } from '../../../support/wizardSteps';
import { PoliciesPage } from './policiesPage';

// The user-side flows run on the same list/viewer route as the SR side
// (/policy-viewer), so list navigation delegates to PoliciesPage.
const policiesPage = new PoliciesPage();

// Placeholder strings the schema form renders per field type; they mark a
// textarea's expected content so the defensive fill picks a valid value.
const PLACEHOLDER_NUMBER = '123';
const PLACEHOLDER_EMAIL = 'example@email.com';

const L = {
    // Registration step. 7252 renders six or fewer roles as role cards
    // (data-role buttons) and a larger role list as the classic p-select
    // dropdown; the pre-7252 app is dropdown-only. Role selection therefore
    // tries the card first and falls back to the dropdown.
    rolesForm: 'div.roles-form',
    roleCard: 'div.roles-form button[data-role]',
    roleSelect: 'div.roles-form p-select',
    roleOption: 'li[role="option"]',
    wizardNext: "button:contains('Continue')",

    // Request forms (request-document-block). Since 7252 the form opens on top
    // of the viewer's content area (a FormTakeover, or a dialog outside the
    // viewer) as the request-document-form component; both presentations share
    // its form-card body and action-buttons footer.
    pageForm: 'request-document-form',
    pageSubmit: 'request-document-form div.action-buttons button.guardian-button-primary',
    requestFormDialog: 'request-document-form',
    dialogTitle: 'div.header-text',
    dialogSubmit: 'request-document-form div.action-buttons button.guardian-button-primary',
    dialogTrigger: (text) => `p-button:contains('${text}')`,

    // Wizard structures
    wizardTab: 'div.policy-content p-tab',
    gridRow: 'div.table-container tbody tr',

    // Statuses
    informationTitle: 'div.title',
    status: (title) => `span[title='${title}']`,
    signButton: 'button.btn-option.btn-SIGN',
    signedStatus: 'div.status.status-SIGNED',
    approveButton: 'button.btn-option.btn-approve',

    // IPFS field
    ipfsField: 'div.form-field-input.ipfs-url',
    ipfsInput: 'div.ipfs-url textarea',
    ipfsError: "small.p-error:contains('Invalid IPFS')",

    // GeoJSON field (geojson-type)
    geoControl: 'app-geojson-type',
    geoModeSwitch: 'div.switch-btn label.guardian-switch-button',
    geoFileDrop: 'app-file-drag-n-drop input[type="file"]',
    includeAllButton: "button.add-feature-button:contains('Include all')",
    addGeometryButton: "button.add-feature-button:contains('Add Geometry')",
    geoClearButton: "button.add-feature-button:contains('Clear')",
    geoTypeDropdown: 'p-select#typeDropdown',
    coordinatesInput: 'textarea#coordinatesInput',
    locationPanel: 'div.location-control',
    geoPreviewUnavailable: 'div.geo-preview-unavailable',
    geoPreviewFile: 'p.geo-preview-file',
    uploadWithoutPreview: "button:contains('Upload without preview')",

    // Interface-action dropdowns (e.g. assign VVB)
    actionDropdown: 'div.content-dropdown p-select',

    // Button blocks
    revokeButton: "button.btn-option:contains('Revoke')",
};

export class UserPoliciesPage {

    openPoliciesTab() {
        policiesPage.openPoliciesTab();
    }

    openPolicy(name) {
        policiesPage.openPolicy(name);
    }

    /**
     * Chooses the role in the registration step and advances. 7252 renders six
     * or fewer roles as role cards (data-role buttons); a larger role list - and
     * the pre-7252 app - uses the p-select dropdown, whose option overlay
     * appends to the body.
     */
    chooseRole(role = 'Registrant') {
        cy.get(L.rolesForm, { timeout: 30000 }).then(($form) => {
            const card = $form.find(`button[data-role="${role}"]`).first();
            if (card.length) {
                cy.wrap(card).click();
            } else {
                cy.get(L.roleSelect, { timeout: 30000 }).first().click();
                cy.get(L.roleOption, { timeout: 30000 }).then(($options) => {
                    const options = $options.toArray();
                    const option =
                        options.find((el) => (el.textContent || '').trim() === role) ||
                        options.find((el) => (el.textContent || '').includes(role));
                    if (!option) {
                        throw new Error(
                            `No role option "${role}". Options: ` +
                                options.map((el) => (el.textContent || '').trim()).join(' | ')
                        );
                    }
                    cy.wrap(option).click();
                });
            }
            cy.get(L.wizardNext, { timeout: 30000 }).click();
        });
    }

    /**
     * Registers in the policy as `role` and submits the role's request form.
     * Registrant / Project Participant / VVB all land on a single-page request form
     * (its submit is the schema form's primary button); the Approver role lands on
     * the sign buttons instead, which appear once a document awaits their signature.
     */
    registerInPolicy(role = 'Registrant') {
        this.chooseRole(role);
        if (role === 'Approver') {
            return clickButtonInWizardSteps(L.signButton);
        }
        cy.get(L.pageForm, { timeout: 30000 }).should('be.visible');
        this.fillFormFields(`${L.pageForm} `);
        cy.get(L.pageSubmit, { timeout: 30000 }).click();
        Checks.waitForElement(L.informationTitle);
    }

    // Chooses the role and stops on the request form (no submit) - used by the
    // field-validation spec, which then drives the individual fields itself.
    registerInPolicySmall(role = 'Registrant') {
        this.chooseRole(role);
        cy.get(L.pageForm, { timeout: 30000 }).should('be.visible');
    }

    /**
     * Defensively fills every schema-form control in `scope` so no required field
     * can block the submit. Values are picked by the field's placeholder (the form
     * renders them per type) and control kind: numbers get a number, dates a date,
     * selects their first option, booleans their first radio. IPFS links and rich
     * editors are left untouched - a made-up CID or document would fail the
     * remote check that a real value passes only after.
     */
    fillFormFields(scope, options = {}) {
        const numberValue = options.numberValue || '1';
        cy.get(`${scope.trim()} div.guardian-input-container`, { log: false }).then(($fields) => {
            const fields = $fields.toArray().filter((el) => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });
            const fillOne = (index) => {
                if (index >= fields.length) {
                    return;
                }
                const $el = Cypress.$(fields[index]);
                const $textarea = $el.find('textarea');
                const $date = $el.find('input.p-datepicker-input');
                const $select = $el.find('p-select');
                const $radio = $el.find('p-radioButton');
                const $geo = $el.find('app-geojson-type');
                const $input = $el.find('input').not('.p-datepicker-input');

                if ($el.hasClass('ipfs-url')) {
                    return fillOne(index + 1);
                }
                if ($geo.length) {
                    // Form-mode geo editor: add one point with the first available type
                    cy.wrap($geo).find(L.addGeometryButton).first().click();
                    cy.wrap($geo).find(L.geoTypeDropdown).first().click();
                    cy.get(L.roleOption, { timeout: 15000 }).first().click();
                    cy.wrap($geo).find(L.coordinatesInput).first().clear();
                    cy.wrap($geo).find(L.coordinatesInput).first().type('[1.23,4.56]');
                    return fillOne(index + 1);
                }
                if ($date.length) {
                    cy.wrap($date.first()).clear();
                    cy.wrap($date.first()).type('2025-01-03');
                    return fillOne(index + 1);
                }
                if ($select.length) {
                    cy.wrap($select.first()).click();
                    cy.get(L.roleOption, { timeout: 15000 }).first().click();
                    return fillOne(index + 1);
                }
                if ($radio.length) {
                    cy.wrap($radio.first()).click({ force: true });
                    return fillOne(index + 1);
                }
                if ($textarea.length) {
                    const placeholder = $textarea.first().attr('placeholder') || '';
                    const value = placeholder === PLACEHOLDER_NUMBER
                        ? numberValue
                        : placeholder === PLACEHOLDER_EMAIL
                            ? 'test@example.com'
                            : 'Test text';
                    cy.wrap($textarea.first()).clear();
                    cy.wrap($textarea.first()).type(value);
                    return fillOne(index + 1);
                }
                if ($input.length) {
                    const placeholder = $input.first().attr('placeholder') || '';
                    const value = placeholder === PLACEHOLDER_NUMBER ? numberValue : 'Test text';
                    cy.wrap($input.first()).clear();
                    cy.wrap($input.first()).type(value);
                    return fillOne(index + 1);
                }
                return fillOne(index + 1);
            };
            fillOne(0);
        });
    }

    // Types a bad IPFS link and expects the form's CID error.
    typeBadIPFS(ipfs) {
        cy.get(L.ipfsInput, { timeout: 30000 }).first().click();
        cy.get(L.ipfsInput, { timeout: 30000 }).first().clear();
        cy.get(L.ipfsInput).first().type(ipfs);
        cy.get(L.ipfsError, { timeout: 30000 }).should('exist');
    }

    // The geo type dropdown offers exactly one shape type for the test schema.
    validateListOfGeoJSONTypes() {
        cy.get(L.addGeometryButton, { timeout: 30000 }).first().click();
        cy.get(`${L.geoControl} small.p-error`, { timeout: 15000 }).should('exist');
        cy.get(L.geoTypeDropdown, { timeout: 15000 }).first().click();
        cy.get(L.roleOption, { timeout: 15000 })
            .should('have.length', 1)
            .first()
            .should('contain.text', 'Polygon')
            .click();
    }

    // Imports a small KML (two shapes): JSON mode hosts the file drop, Form mode
    // hosts "Include all" and the resulting location rows.
    validateGeoJSONFileImport(fileName) {
        cy.get(L.geoModeSwitch).first().click();
        cy.get(L.geoFileDrop, { timeout: 15000 }).first().selectFile('cypress/fixtures/' + fileName, { force: true });
        cy.get(L.geoModeSwitch).first().click();
        cy.get(L.includeAllButton, { timeout: 15000 }).first().click();
        cy.get(L.locationPanel).should('have.length', 2);
        cy.get(`${L.geoControl} small.p-error`).should('not.exist');
        cy.get(L.geoClearButton).first().click();
    }

    // A 32 MB file exceeds the in-browser preview limit: accept the upload without
    // preview and expect the unavailable-preview notice in both view modes.
    validateGeoJSONLargeFileImport(fileName) {
        cy.get(L.geoModeSwitch).first().click();
        cy.get(L.geoFileDrop, { timeout: 15000 }).first().selectFile('cypress/fixtures/' + fileName, { force: true });
        cy.get(L.uploadWithoutPreview, { timeout: 15000 }).click();
        cy.get(L.geoPreviewUnavailable).should('be.visible');
        cy.get(L.geoPreviewFile).should('contain.text', fileName);
        cy.get(L.geoModeSwitch).first().click();
        cy.get(L.geoPreviewUnavailable).should('be.visible');
        cy.get(L.geoPreviewFile).should('contain.text', fileName);
    }

    // ---- User-side document creation ----

    // Opens the Devices tab and submits the device request form (dialog).
    createDeviceInPolicy() {
        Checks.waitForLoading();
        clickWizardTab('Devices');
        cy.get(L.dialogTrigger('Create New Device'), { timeout: 30000 }).first().click();
        cy.get(L.requestFormDialog, { timeout: 30000 }).should('be.visible');
        this.fillFormFields(`${L.requestFormDialog} `);
        cy.get(L.dialogSubmit, { timeout: 30000 }).click();
        cy.get(L.requestFormDialog).should('not.exist');
        cy.get(L.status('Waiting for approval'), { timeout: 60000 }).should('exist');
    }

    // Opens the Devices tab and submits the issue request form (dialog); the
    // schema's number fields take `amount`, everything else gets defensive values.
    createIssueRequestInPolicy(amount = '1') {
        Checks.waitForLoading();
        clickWizardTab('Devices');
        cy.get(L.dialogTrigger('Create Issue Request'), { timeout: 30000 }).first().click();
        cy.get(L.requestFormDialog, { timeout: 30000 }).should('be.visible');
        this.fillFormFields(`${L.requestFormDialog} `, { numberValue: amount });
        cy.get(L.dialogSubmit, { timeout: 30000 }).click();
        cy.get(L.requestFormDialog).should('not.exist');
        clickWizardTab('Issue Requests');
        cy.get(L.status('Waiting for approval'), { timeout: 60000 }).should('exist');
    }

    // ---- Approval (multi-sign policies: the Approver role signs) ----

    approve(waitFor = 'default') {
        if (waitFor === 'default') {
            clickButtonInWizardSteps(L.signButton);
            cy.get(L.signedStatus, { timeout: 60000 }).should('exist');
        } else if (waitFor === 'validationLabel') {
            clickButtonInWizardSteps(L.approveButton);
            cy.get(L.status('Validated'), { timeout: 60000 }).should('exist');
        } else if (waitFor === 'Report') {
            clickButtonInWizardSteps(L.approveButton);
            cy.get(L.status('Verified'), { timeout: 60000 }).should('exist');
        } else {
            throw new Error(`Unknown approval wait mode: ${waitFor}`);
        }
    }

    approveUserInPolicy() {
        this.approve();
    }

    approveDeviceInPolicy() {
        Checks.waitForLoading();
        clickWizardTab('Devices');
        this.approve();
    }

    approveIssueRequestInPolicy() {
        Checks.waitForLoading();
        clickWizardTab('Issue Requests');
        this.approve();
    }

    // Once the workflow has passed a step, its revoke button must be gone.
    checkRevokeButtonDisappear() {
        cy.wait(2000);
        Checks.waitForLoading();
        cy.get('div.policy-content').find(L.revokeButton).should('not.exist');
    }

    // ---- CDM: project & report (Project Participant side) ----

    // Projects tab -> "New project" dialog -> submit.
    createProject() {
        Checks.waitForLoading();
        clickWizardTab('Projects');
        cy.get(L.dialogTrigger('New project'), { timeout: 30000 }).first().click();
        cy.get(L.requestFormDialog, { timeout: 30000 }).should('be.visible');
        this.fillFormFields(`${L.requestFormDialog} `);
        cy.get(L.dialogSubmit, { timeout: 30000 }).click();
        cy.get(L.requestFormDialog).should('not.exist');
        cy.get(L.status('Waiting for Validation'), { timeout: 60000 }).should('exist');
    }

    // Projects tab -> "Add Report" dialog -> submit, then the Monitoring Reports
    // tab shows the new report awaiting verification.
    createReport() {
        Checks.waitForLoading();
        clickWizardTab('Projects');
        cy.get(L.dialogTrigger('Add Report'), { timeout: 30000 }).first().click();
        cy.get(L.requestFormDialog, { timeout: 30000 }).should('be.visible');
        this.fillFormFields(`${L.requestFormDialog} `);
        cy.get(L.dialogSubmit, { timeout: 30000 }).click();
        cy.get(L.requestFormDialog).should('not.exist');
        clickWizardTab('Monitoring Reports');
        cy.get(L.status('Waiting for Verification'), { timeout: 60000 }).should('exist');
    }

    // Picks the first VVB in the assign action dropdown (Monitoring Reports tab).
    assignReport() {
        cy.get(L.actionDropdown, { timeout: 30000 }).first().click();
        cy.get(L.roleOption, { timeout: 15000 }).first().click();
        cy.get(L.status('Waiting for Verification'), { timeout: 60000 }).should('exist');
    }

    // VVB side: verify the report (Monitoring Reports tab -> Verify).
    verifyReport() {
        Checks.waitForLoading();
        clickWizardTab('Monitoring Reports');
        this.approve('Report');
    }
}
