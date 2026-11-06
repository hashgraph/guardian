import CommonElements from '../../../support/defaultUIElements';
import * as Checks from '../../../support/checkingMethods';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';
import { clickWizardTab } from '../../../support/wizardSteps';

const d = new Date(2022, 3, 3);

const UserPoliciesPageLocators = {
    roleSelect: '[data-role]',
    groupTemplateSelect: '#groupDropdown',
    groupLabelInput: '#groupLabelInput',
    createGroupButton: 'Create group',
    role: (roleName) => `[data-role="${roleName}"]`,
    nextButton: "button:contains('Continue')",
    requestDocumentBlock: 'request-document-block',
    requestForm: 'request-document-form',
    submitButton: "button:contains('Validate & Create')",
    divTitle: 'div.pv-state__title',
    waitingForApprovalTitle: "span[title='Waiting for approval']",
    signedStatus: 'div.status-SIGNED',
    deviceTab: 'Devices',
    issueRequestsTab: 'Issue Requests',
    createDeviceButton: ' Create New Device ',
    createIssueRequestButton: ' Create Issue Request ',
    createButton: 'button:contains("Create")',
    signButton: 'div.btn-SIGN',
    vvbName: 'div:contains("VVB Name")',
    ppName: 'h2.form-heading-title:contains("New PP")',
    textFieldInput: 'div.form-field-value input, div.form-field-value textarea',
    newVerraProjectButton: 'button:contains(" New Project ")',
    newProjectButton: 'button:contains(" New project ")',
    enterTextInput: '[placeholder="Please enter text here"]',
    enterNumInput: '[placeholder="123"]',
    enterEmailInput: '[placeholder="example@email.com"]',
    chooseOptionInput: '[placeholder="Not selected"] span:contains("Not selected")',
    chooseChoiceGroup: '.sf-choice',
    enterPosInputVerra: '[placeholder="[1.23,4.56]"]',
    enterPosInput: '[id="coordinatesInput"]',
    waitingForAdded: "span[title='Waiting to be Added']",
    ddAssignName: "p-dropdown[optionlabel='name']",
    projectTab: 'Projects',
    validated: "span[title='Validated']",
    verified: "span[title='Verified']",
    approveButton: 'button.btn-approve',
    createReportButton: "button:contains(' Add Report ')",
    revokeButton: "button-block div:contains(' Revoke ')",
    waitingForValidation: "span[title = 'Waiting for Validation']",
    waitingForVerification: "span[title = 'Waiting for Verification']",
    IPFSInput: 'div.ipfs-url textarea',
    IPFSErrorLabel: ' Invalid IPFS CID/URL ',
    addLocButton: 'button.add-btn',
    addGeoButton: 'Add Geometry',
    geoJSONTypeDropdown: "p-select[id='typeDropdown']",
    geoJSONTypeDropdownList: 'li[role="option"]',
    geoJSONErrorLabel: 'A GeoJSON object is required',
    switchButtonGeoJSONInput: 'switch-button',
    // the form's draft menu has a file input of its own
    geoJSONFileInput: 'app-geojson-type app-file-drag-n-drop input[type="file"]',
    includeAllButton: 'Include all',
    clearButton: 'Clear',
    locationPanel: 'div.location-control',
    largeFileDialogHeader: 'File too large to preview',
    largeFileAccept: 'Upload without preview',
    previewUnavailable: 'app-geojson-type .geo-preview-unavailable',
    previewFileName: 'app-geojson-type .geo-preview-file',

    policiesList: '/api/v1/policies?pageIndex=0&pageSize=10',
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    applicationRegBtns: 'div.page-btns',
    appRegistrantDetails: '/api/v1/profiles/Registranttt',
    tokensWaiter: '/api/v1/tokens',
    inputGroupLabel: '[formcontrolname="groupLabel"]',
    profileTab: 'Profile',
    tokensBtn: 'TOKENS',
    createIsssueRequestBtn: 'Create Issue Request',
    hederaId: 'HEDERA ID',
    profileValue: 'div.account-item-value',
    profilePage: '/api/v1/schemas/system/entity/USER',
    balance: '/api/v1/profiles/Registrant/balance',
    approvalLabel: 'app-information-block',
    tokenId: 'hedera-explorer > a',
    tokenIdByHistory: 'td.cdk-column-1',
};

// Short enums and booleans render as segmented choices instead of dropdowns:
// pick the first option of every group that has none selected. Queries through
// jQuery so that a form without such groups does not fail.
function chooseChoiceGroups() {
    cy.get('body').then(($body) => {
        $body.find(UserPoliciesPageLocators.chooseChoiceGroup).each((_, group) => {
            const $group = Cypress.$(group);
            if (!$group.find('[role="radio"][aria-checked="true"]').length) {
                cy.wrap($group.find('[role="radio"]').first()).click();
            }
        });
    });
}

// A form with sub-schemas opens on its overview and draws only the active section, so a
// field query can match nothing in a section. Search with jQuery: cy.get would retry and time out.
function inForm(selector) {
    return cy.get(UserPoliciesPageLocators.requestForm).then(($form) => $form.find(selector));
}

// Types `value` into the input of the field labelled `label`, when the open section has it. The input
// is looked up again for each command: the form re-renders while it validates what was typed.
function typeInField(label, value) {
    const fieldInput = () => cy.get(`${UserPoliciesPageLocators.requestForm} .form-field`)
        .filter((_, field) => field.querySelector('.sf-label-text')?.textContent.trim() === label)
        .find('input.p-datepicker-input, textarea')
        .first();
    cy.get('body').then(($body) => {
        const present = $body.find(`${UserPoliciesPageLocators.requestForm} .form-field`)
            .filter((_, field) => field.querySelector('.sf-label-text')?.textContent.trim() === label).length > 0;
        if (present) {
            fieldInput().type(value, { force: true });
            fieldInput().blur({ force: true });
        }
    });
}

// Fills the form section by section: opens the overview's Start (or Continue) when the
// form opens on it, runs fill(), then follows the footer's Next until it disappears.
// Works with the rail (wide windows) and with the section bar (Cypress default 1000px).
function openOverviewSection() {
    const form = UserPoliciesPageLocators.requestForm;
    const start = `${form} .sf-overview-actions button:contains('Start'), ${form} .sf-overview-actions button:contains('Continue')`;
    // The form draws its overview or its fields a moment after the block itself appears.
    cy.get(`${form} .sf-overview-actions, ${form} .form-field`, { timeout: TIMEOUTS.backend });
    cy.get('body').then(($body) => {
        // Clicked in the same tick it is found: the overview gives way to the first section by itself
        // while the form settles, and a button looked up earlier would be gone by the time Cypress clicks it.
        $body.find(start).first().each((_, button) => button.click());
    });
}

function fillFormSections(fill) {
    const form = UserPoliciesPageLocators.requestForm;
    openOverviewSection();
    fill();
    const next = () => {
        cy.get('body').then(($body) => {
            const $next = $body.find(`${form} .form-button[id="next"][visible="true"] button`);
            if ($next.length) {
                cy.wrap($next.first()).click();
                fill();
                next();
            }
        });
    };
    next();
}

export class UserPoliciesPage {

    openPoliciesTab() {
        cy.get(CommonElements.navBar).should('exist')
        cy.get('body').then(($body) => {
            if ($body.find(`span:contains(${CommonElements.userPoliciesTab})`).length == 0)
                {cy.get(CommonElements.navBar).contains(CommonElements.mainPoliciesTab).click();}
        })
        cy.get(CommonElements.navBar).contains(CommonElements.userPoliciesTab).click();
    }

    // After a successful submit the form either stays open on its Submitted screen or, when the
    // submission moves the policy on at once (a registration waiting for approval), is replaced by the
    // next block and never shows it. Both mean the document was accepted.
    closeSubmitted() {
        const banner = `${UserPoliciesPageLocators.requestForm} .form-submitted-banner`;
        cy.get('body', { timeout: TIMEOUTS.backend }).should(($body) => {
            const submitted = $body.find(banner).length > 0;
            const formReplaced = $body.find(UserPoliciesPageLocators.requestForm).length === 0;
            expect(submitted || formReplaced, 'the Submitted screen or the next block').to.eq(true);
        });
        cy.get('body').then(($body) => {
            if ($body.find(banner).length > 0) {
                cy.get(`${UserPoliciesPageLocators.requestForm} button.form-back`).click();
            }
        });
    }

    // A policy with groups asks for a group template (and a label when the group is private) instead
    // of a role; the template of the 'Approver' role is the global group 'Approvers'.
    _createGroup(role) {
        const template = role === 'Approver' ? 'Approvers' : role;
        cy.get(UserPoliciesPageLocators.groupTemplateSelect, { timeout: TIMEOUTS.ui }).click();
        cy.contains(CommonElements.dropdownOption, new RegExp(`^\\s*${template}\\s*$`)).click();
        cy.get('body').then(($body) => {
            if ($body.find(UserPoliciesPageLocators.groupLabelInput).length) {
                cy.get(UserPoliciesPageLocators.groupLabelInput).type(`${template}Group`);
            }
        });
        cy.contains('button', UserPoliciesPageLocators.createGroupButton).click();
    }

    registerInPolicy(role = 'Registrant') {
        cy.get(`${UserPoliciesPageLocators.roleSelect}, ${UserPoliciesPageLocators.groupTemplateSelect}`, { timeout: TIMEOUTS.backend });
        cy.get('body').then(($body) => {
            if ($body.find(UserPoliciesPageLocators.groupTemplateSelect).length) {
                this._createGroup(role);
            } else {
                cy.get(UserPoliciesPageLocators.role(role)).click();
                cy.get(UserPoliciesPageLocators.nextButton).click();
            }
        });
        if (role == 'Registrant') {
            Checks.waitForElement(UserPoliciesPageLocators.requestDocumentBlock);
            cy.get(UserPoliciesPageLocators.submitButton).click();
            this.closeSubmitted();
            Checks.waitForElement(UserPoliciesPageLocators.divTitle);
        }
        if (role == 'Project_Proponent') {
            Checks.waitForElement(UserPoliciesPageLocators.requestDocumentBlock);
            cy.get(UserPoliciesPageLocators.newVerraProjectButton).click();
            fillFormSections(() => {
                inForm(UserPoliciesPageLocators.enterTextInput).then((els) => {
                    [...els].forEach((el) =>
                        cy.wrap(el).type('Test text', { force: true })
                    );
                });
                inForm(UserPoliciesPageLocators.enterNumInput).then((els) => {
                    [...els].forEach((el) => cy.wrap(el).type('123', { force: true }));
                });
                inForm('input[aria-haspopup="dialog"]').then((els) => {
                    [...els].forEach((el) =>
                        cy.wrap(el).type(d.toLocaleDateString('en-GB'))
                    );
                });
                inForm('input[aria-haspopup="dialog"]').then((els) => {
                    [...els].forEach((el) =>
                        cy.wrap(el).type(d.toLocaleDateString('ipfs://ba'))
                    );
                });
                inForm(UserPoliciesPageLocators.enterEmailInput).then((els) => {
                    [...els].forEach((el) =>
                        cy.wrap(el).type('asd@dsa.dsa')
                    );
                });
                inForm(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
                    [...els].forEach((el) => {
                        cy.wrap(el).click();
                        cy.get(CommonElements.dropdownOption);
                    });
                });
                chooseChoiceGroups();
                inForm(UserPoliciesPageLocators.enterPosInput).then((els) => {
                    [...els].forEach((el) => {
                        cy.wrap(el).type('[1.23,4.56]')
                    });
                });
                chooseChoiceGroups();
            });
            cy.get(UserPoliciesPageLocators.createButton).click();
            this.closeSubmitted();
            Checks.waitForElement(UserPoliciesPageLocators.waitingForAdded);
        }
        if (role == 'VVB') {
            Checks.waitForElement(UserPoliciesPageLocators.vvbName);
            cy.get(UserPoliciesPageLocators.textFieldInput).type('VVBName');
            cy.get(UserPoliciesPageLocators.submitButton).click();
            this.closeSubmitted();
            Checks.waitForElement(UserPoliciesPageLocators.divTitle);
        }
        if (role == 'Project Participant') {
            Checks.waitForElement(UserPoliciesPageLocators.ppName);
            cy.get(UserPoliciesPageLocators.textFieldInput).type('PPName');
            cy.get(UserPoliciesPageLocators.submitButton).click();
            this.closeSubmitted();
            Checks.waitForElement(UserPoliciesPageLocators.divTitle);
        }
        if (role == 'Approvers')
            {Checks.waitForElement(UserPoliciesPageLocators.signButton);}
    }

    registerInPolicySmall() {
        cy.get(UserPoliciesPageLocators.roleSelect).should('be.visible');
        cy.get(UserPoliciesPageLocators.role('Registrant')).click();
        cy.get(UserPoliciesPageLocators.nextButton).click();
        Checks.waitForElement(UserPoliciesPageLocators.requestDocumentBlock);
        openOverviewSection();
    }

    typeBadIPFS(IPFS) {
        cy.get(UserPoliciesPageLocators.IPFSInput).type(IPFS);
		cy.get(UserPoliciesPageLocators.IPFSInput).blur();
        cy.contains(UserPoliciesPageLocators.IPFSErrorLabel).should('exist');
    }

    validateListOfGeoJSONTypes() {
        cy.get(UserPoliciesPageLocators.addLocButton).click();
        cy.contains(UserPoliciesPageLocators.addGeoButton).click();
        cy.contains(UserPoliciesPageLocators.geoJSONErrorLabel).should('exist');
        cy.get(UserPoliciesPageLocators.geoJSONTypeDropdown).click();
        cy.get(UserPoliciesPageLocators.geoJSONTypeDropdownList).should('have.length', 1);
        cy.get(UserPoliciesPageLocators.geoJSONTypeDropdownList).first().find('span').should('have.text', 'Polygon');
    }

    validateGeoJSONFileImport(fileName) {
        openOverviewSection();
        cy.get(UserPoliciesPageLocators.addLocButton).click();
        cy.get(UserPoliciesPageLocators.switchButtonGeoJSONInput).click();
        cy.get(UserPoliciesPageLocators.geoJSONFileInput).selectFile('cypress/fixtures/' + fileName, { force: true });
        cy.contains(UserPoliciesPageLocators.includeAllButton).click();
        cy.get(UserPoliciesPageLocators.locationPanel).should('have.length', 2);
        cy.contains(UserPoliciesPageLocators.geoJSONErrorLabel).should('not.exist');
        cy.contains(UserPoliciesPageLocators.clearButton).click();
    }

    // A file above the preview limit is imported without a map preview, after the user agrees to that.
    validateGeoJSONLargeFileImport(fileName) {
        cy.get(UserPoliciesPageLocators.switchButtonGeoJSONInput).click();
        cy.get(UserPoliciesPageLocators.geoJSONFileInput).selectFile('cypress/fixtures/' + fileName, { force: true });
        cy.contains(UserPoliciesPageLocators.largeFileDialogHeader, { timeout: TIMEOUTS.backend }).should('exist');
        cy.contains('button', UserPoliciesPageLocators.largeFileAccept).click();
        cy.get(UserPoliciesPageLocators.previewUnavailable, { timeout: TIMEOUTS.backend })
            .should('contain.text', 'this file is too large to show on the map');
        cy.get(UserPoliciesPageLocators.previewFileName).should('contain.text', fileName);
    }

    openPolicy(name) {
        cy.contains('td', name).siblings().eq(0).click();
        Checks.waitForLoading();
    }

    createDeviceInPolicy() {
        Checks.waitForLoading();
        cy.contains(UserPoliciesPageLocators.deviceTab).click();
        cy.contains(UserPoliciesPageLocators.createDeviceButton).click();
        cy.get(UserPoliciesPageLocators.requestForm).find(UserPoliciesPageLocators.createButton).click();
        this.closeSubmitted();
        Checks.waitForElement(UserPoliciesPageLocators.waitingForApprovalTitle);
    }

    createIssueRequestInPolicy(ammount = '1') {
        Checks.waitForLoading();
        cy.contains(UserPoliciesPageLocators.deviceTab).click();
        cy.contains(UserPoliciesPageLocators.createIssueRequestButton).click();
        // The production period and the amount live in the "Other details" section of the form.
        fillFormSections(() => {
            typeInField('Production Period Start Date', '2025-01-03');
            typeInField('Production Period End Date', '2025-01-05');
            typeInField('Total kWh Produced in this period', ammount);
        });
        cy.get(UserPoliciesPageLocators.requestForm).find(UserPoliciesPageLocators.createButton).click();
        this.closeSubmitted();
        cy.get(CommonElements.Loading).should('not.exist');
        cy.contains(UserPoliciesPageLocators.issueRequestsTab).click();
        Checks.waitForElement(UserPoliciesPageLocators.waitingForApprovalTitle);
    }

    approve(waitFor = 'default') {
        if (waitFor == 'default') {
            cy.get(UserPoliciesPageLocators.signButton).click();
            Checks.waitForElement(UserPoliciesPageLocators.signedStatus);
        }
        if (waitFor == 'validationLabel') {
            cy.get(UserPoliciesPageLocators.approveButton).click();
            Checks.waitForElement(UserPoliciesPageLocators.validated);
        }
        if (waitFor == 'Report') {
            cy.get(UserPoliciesPageLocators.approveButton).click();
            Checks.waitForElement(UserPoliciesPageLocators.verified);
        }
    }

    approveUserInPolicy() {
        this.approve()
    }

    checkRevokeButtonDisappear() {
        Checks.waitForLoading();
        cy.get(UserPoliciesPageLocators.revokeButton, { timeout: TIMEOUTS.backend }).should('not.exist')
    }

    approveDeviceInPolicy() {
        Checks.waitForLoading();
        cy.contains(UserPoliciesPageLocators.deviceTab).click();
        this.approve()
    }

    approveIssueRequestInPolicy() {
        Checks.waitForLoading();
        cy.contains(UserPoliciesPageLocators.issueRequestsTab).click();
        this.approve()
    }

    assignProject() {
        cy.get(UserPoliciesPageLocators.ddAssignName).click();
        cy.get(CommonElements.dropdownOption).click();
    }

    approveProject() {
        cy.contains(UserPoliciesPageLocators.projectTab).click();
        this.approve('validationLabel');
    }

    createReport() {
        clickWizardTab('Projects');
        cy.get(UserPoliciesPageLocators.createReportButton).click();
        fillFormSections(() => {
            inForm(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
                [...els].forEach((el) => {
                    cy.wrap(el).click();
                    cy.get(CommonElements.dropdownOption).first().click();
                });
            });
            chooseChoiceGroups();
            inForm(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
                [...els].forEach((el) => {
                    cy.wrap(el).click();
                    cy.get(CommonElements.dropdownOption).first().click();
                });
            });
            chooseChoiceGroups();
            inForm(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
                [...els].forEach((el) => {
                    cy.wrap(el).click();
                    cy.get(CommonElements.dropdownOption).first().click();
                });
            });
            chooseChoiceGroups();
            inForm(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
                [...els].forEach((el) => {
                    cy.wrap(el).click();
                    cy.get(CommonElements.dropdownOption).first().click();
                });
            });
            chooseChoiceGroups();
            inForm(UserPoliciesPageLocators.enterTextInput).then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type('Test text', { force: true })
                );
            });
            inForm(UserPoliciesPageLocators.enterNumInput).then((els) => {
                [...els].forEach((el) => cy.wrap(el).type('123', { force: true }));
            });
            inForm('input[aria-haspopup="dialog"]').then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type('2025-01-03', { force: true })
                );
            });
        });
        cy.get(UserPoliciesPageLocators.createButton).click();
        cy.get('.preloader-image').should('not.exist');
        clickWizardTab('Monitoring reports');
        Checks.waitForElement(UserPoliciesPageLocators.waitingForVerification);
    }

    createReportVerra() {
        cy.get(UserPoliciesPageLocators.createReportButton).click();
        fillFormSections(() => {
            inForm(UserPoliciesPageLocators.enterTextInput).then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type('Test text', { force: true })
                );
            });
            inForm(UserPoliciesPageLocators.enterNumInput).then((els) => {
                [...els].forEach((el) => cy.wrap(el).type('123', { force: true }));
            });
            inForm('input[aria-haspopup="dialog"]').then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type(d.toLocaleDateString('en-GB'))
                );
            });
            inForm('input[aria-haspopup="dialog"]').then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type('ipfs://ba')
                );
            });
            inForm(UserPoliciesPageLocators.enterEmailInput).then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type('asd@dsa.dsa')
                );
            });
            inForm(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
                [...els].forEach((el) => {
                    cy.wrap(el).click();
                    cy.get(CommonElements.dropdownOption);
                });
            });
            chooseChoiceGroups();
            inForm(UserPoliciesPageLocators.enterPosInput).then((els) => {
                [...els].forEach((el) => {
                    cy.wrap(el).type('[1.23,4.56]')
                });
            });
            chooseChoiceGroups();
        });
        cy.get(UserPoliciesPageLocators.createButton).click();
        cy.get(CommonElements.Loading).should('not.exist');
        cy.get('.preloader-image').should('not.exist');
        clickWizardTab('Monitoring reports');
        Checks.waitForElement(UserPoliciesPageLocators.waitingForValidation);
    }

    assignReport() {
        cy.get('p-dropdown[placeholder="Select"]').click();
        cy.get(CommonElements.dropdownOption).click();
        Checks.waitForElement(UserPoliciesPageLocators.waitingForVerification);
    }

    verifyReport() {
        cy.get(CommonElements.Loading).should('not.exist');
        cy.get('.preloader-image').should('not.exist');
        clickWizardTab('Monitoring reports');
        this.approve('Report');
    }

    createProject() {
        Checks.waitForLoading();
        clickWizardTab('Projects');
        Checks.waitForLoading();
        cy.get(UserPoliciesPageLocators.newProjectButton).click();
        fillFormSections(() => {
            inForm(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
                cy.log(els.length);
                [...els].forEach((el) => {
                    cy.wrap(el).click();
                    cy.get(CommonElements.dropdownOption).first().click();
                });
            });
            chooseChoiceGroups();
            inForm(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
                cy.log(els.length);
                [...els].forEach((el) => {
                    cy.wrap(el).click();
                    cy.get(CommonElements.dropdownOption).first().click();
                });
            });
            chooseChoiceGroups();
            inForm(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
                cy.log(els.length);
                [...els].forEach((el) => {
                    cy.wrap(el).click();
                    cy.get(CommonElements.dropdownOption).first().click();
                });
            });
            chooseChoiceGroups();
            inForm(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
                cy.log(els.length);
                [...els].forEach((el) => {
                    cy.wrap(el).click();
                    cy.get(CommonElements.dropdownOption).first().click();
                });
            });
            chooseChoiceGroups();
            inForm(UserPoliciesPageLocators.enterTextInput).then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type('Test text', { force: true })
                );
            });
            inForm(UserPoliciesPageLocators.enterNumInput).then((els) => {
                [...els].forEach((el) => cy.wrap(el).type('1', { force: true }));
            });
            inForm('input[aria-haspopup="dialog"]').then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type('2025-01-03', { force: true })
                );
            });
            inForm(UserPoliciesPageLocators.enterEmailInput).then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type('asd@dsa.dsa')
                );
            });
            inForm(UserPoliciesPageLocators.enterPosInput).then((els) => {
                [...els].forEach((el) => {
                    cy.wrap(el).type('[1.23,4.56]')
                });
            });
        });
        cy.get(UserPoliciesPageLocators.createButton).click();
        Checks.waitForElement(UserPoliciesPageLocators.waitingForValidation);
    }

    createGroup(role) {
        // cy.contains("Policies").click({ force: true });
        // cy.contains("List of Policies").click({ force: true });
        // cy.wait(1000)
        // cy.get("td").first().parent().get("td").eq("6").contains("Open").click();
        // cy.wait(1000)
        // cy.get(RegistrantPageLocators.roleSelect).click().get("p-dropdownitem").contains(role).click();
        // cy.get(RegistrantPageLocators.submitBtn).click({ force: true });
        // cy.intercept("/api/v1/profiles/" + role).as("waitForRegister" + role);
        // cy.wait("@waitForRegister" + role, { timeout: TIMEOUTS.longOperation });
        // cy.get(RegistrantPageLocators.applicationRegBtns).contains("Next").click();
        // cy.get(RegistrantPageLocators.applicationRegBtns).contains("Next").click();
        // cy.get(RegistrantPageLocators.applicationRegBtns).contains("Create").click();
        // cy.wait(90000);
        // cy.contains("Submitted for Approval").should("exist");
    }

    openUserProfile() {
        // cy.visit(URL.Root + URL.Profile);
    }

    openTokensTab() {
        // cy.visit(URL.Root + URL.UserTokens);
    }

    createGroup(role) {
        // cy.contains("Policies").click({force: true});
        // cy.contains("List of Policies").click({force: true});
        // cy.wait(1000)
        // cy.get("td").first().parent().get("td").eq("6").contains("Open").click();
        // cy.wait(1000)
        // cy.get(RegistrantPageLocators.roleSelect).click().get("p-dropdownitem").contains(role).click();
        // cy.get(RegistrantPageLocators.submitBtn).click({force: true});
        // cy.intercept("/api/v1/profiles/" + role).as("waitForRegister" + role);
        // cy.wait("@waitForRegister" + role, { timeout: TIMEOUTS.longOperation });
        // cy.get(RegistrantPageLocators.applicationRegBtns).contains("Next").click();
        // cy.get(RegistrantPageLocators.applicationRegBtns).contains("Next").click();
        // cy.get(RegistrantPageLocators.applicationRegBtns).contains("Create").click();
        // cy.wait(90000);
        // cy.contains("Submitted for Approval").should("exist");
    }

    static waitForPolicyList() {
        // cy.intercept(RegistrantPageLocators.policiesList).as(
        //     "waitForPoliciesList"
        // );
        // cy.wait("@waitForPoliciesList", {timeout: TIMEOUTS.backend})
    }

    static waitForBalance() {
        // cy.intercept(RegistrantPageLocators.balance).as(
        //     "waitForBalance"
        // );
        // cy.wait(['@waitForBalance', '@waitForBalance'], {timeout: TIMEOUTS.backend})
    }

    static waitForRegistrant() {
        // cy.intercept(RegistrantPageLocators.profilePage).as(
        //     "waitForRegistrant"
        // );
        // cy.wait("@waitForRegistrant", {timeout: TIMEOUTS.backend})
    }

    chooseRole(role) {
        // cy.contains("Policies").click({force: true});
        // cy.get("td").first().parent().get("td").eq("4").click();
        // cy.get(RegistrantPageLocators.roleSelect)
        //     .click()
        //     .get("mat-option")
        //     .contains(role)
        //     .click();
        // cy.get(RegistrantPageLocators.submitBtn).click();
        // cy.wait(12000);
        // cy.get(RegistrantPageLocators.submitBtn).click();
    }

    createDevice() {
        // RegistrantPage.waitForRegistrant();
        // cy.contains("Policies").click({force: true});
        // cy.contains("List of Policies").click({force: true});
        // RegistrantPage.waitForPolicyList();
        // cy.get("td").first().parent().get("td").eq("6").contains("Open").click();
        // cy.contains("Devices").click({force: true});
        // cy.intercept("/api/v1/profiles/Registrant").as("waitForRegisterRegistrant");
        // cy.wait("@waitForRegisterRegistrant", { timeout: TIMEOUTS.longOperation });
        // cy.contains(RegistrantPageLocators.createDeviceBtn).click();
        // cy.get(RegistrantPageLocators.submitBtn).last().click();
        // cy.wait(60000);
        // cy.contains("Waiting for approval").should("exist");
    }

    createIssueRequest() {
        // RegistrantPage.waitForRegistrant();
        // cy.contains("Policies").click({force: true});
        // cy.contains("List of Policies").click({force: true});
        // cy.get("td").first().parent().get("td").eq("6").contains("Open").click();
        // cy.contains("Devices").click({force: true});
        // cy.intercept("/api/v1/profiles/Registrant").as("waitForRegisterRegistrant");
        // cy.wait("@waitForRegisterRegistrant", { timeout: TIMEOUTS.longOperation });
        // cy.contains(RegistrantPageLocators.createIsssueRequestBtn).click();
        // cy.get(RegistrantPageLocators.submitBtn).last().click();
        // cy.wait(60000);
        // cy.contains("Issue Requests").click({force: true});
        // cy.contains("Waiting for approval").should("exist");
    }

    getId() {
        // RegistrantPage.waitForBalance();
        // cy.contains(RegistrantPageLocators.hederaId).parent().find(RegistrantPageLocators.profileValue).find("a")
        //     .then(($div) => {
        //         cy.writeFile('cypress/fixtures/regId.txt', $div.get(0).innerText);
        //     });
    }

    checkTokenBalance() {
        // cy.intercept(RegistrantPageLocators.tokensWaiter).as(
        //     "waitForTokens"
        // );
        // cy.wait("@waitForTokens", {timeout: TIMEOUTS.backend})
        // cy.get("td").last().parent().find("td").eq("2").should('have.text', " 123 ");
        // let tokenId;
        // cy.readFile('cypress/fixtures/tokenId.txt').then(file => {
        //     tokenId = file;
        // }).then(() => {
        //     cy.contains(tokenId.trim()).should("exist");
        // })
    }

    checkTokenHistory() {
        //     cy.contains("Policies").click({force: true});
        //     cy.wait(2000);
        //     cy.get("td").first().parent().get("td").eq("5").click();
        //     cy.contains("Token History").click({force: true});
        //     cy.get(RegistrantPageLocators.tokenIdByHistory)
        //         .then(($a) => {
        //             cy.writeFile('cypress/fixtures/tokenId.txt', $a.find('.text').text());
        //         });
    }
}
