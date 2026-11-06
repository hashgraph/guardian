import * as Checks from './checkingMethods';
import { TIMEOUTS } from './CustomHelpers/timeouts';

// Tags are managed through the tags-explorer widget a list row embeds. `getRow` re-queries the row
// on every call, because the list re-renders after each tag change and a stored subject detaches.
const L = {
    explorer: 'tags-explorer',
    createButton: 'button:contains("Create a Tag")',
    chip: 'tags-explorer .main-tag',
    createDialog: 'tags-create-dialog',
    createDialogButton: 'tags-create-dialog button',
    nameInput: 'tags-create-dialog input[formcontrolname="name"]',
    descriptionInput: 'tags-create-dialog input[formcontrolname="description"]',
    listDialog: 'tags-explorer-dialog',
    chipInListDialog: 'tags-explorer-dialog div.name',
    detailDelete: 'tags-explorer-dialog .details-container svg-icon[src*="delete"]',
};

export const addTag = (getRow, tagName) => {
    getRow().find(L.explorer).find(L.createButton).click();
    cy.get(L.createDialog, { timeout: TIMEOUTS.ui }).should('be.visible');
    // Create is enabled once the dialog has finished loading; typing earlier is lost on its re-render,
    // and so is the rest of a field typed before the other one (hence description first, name last).
    cy.contains(L.createDialogButton, 'Create').should('be.enabled');
    cy.get(L.descriptionInput).clear();
    cy.get(L.descriptionInput).type(tagName);
    cy.get(L.nameInput).clear();
    cy.get(L.nameInput).type(tagName);
    cy.get(L.nameInput).should('have.value', tagName);
    // pButton binds [label], which leaves no attribute in the DOM: find the button by its text.
    cy.contains(L.createDialogButton, 'Create').click();
    cy.get(L.createDialog).should('not.exist');
    Checks.waitForLoading();
    getRow().find(L.chip, { timeout: TIMEOUTS.backend }).should('contain.text', tagName);
};

export const deleteTag = (getRow, tagName) => {
    getRow().find(L.chip).contains(tagName).click();
    cy.get(L.listDialog, { timeout: TIMEOUTS.ui }).should('be.visible');
    cy.get(L.chipInListDialog).contains(tagName).click();
    cy.get(L.detailDelete, { timeout: TIMEOUTS.ui }).first().click();
    Checks.waitForLoading();
    // The last tag leaves no chip at all, so assert on the dialog rather than chaining find().
    cy.get(L.listDialog).should(($dialog) => {
        const remaining = $dialog.find(L.chipInListDialog).filter((_, chip) => chip.textContent.includes(tagName));
        expect(remaining.length).to.eq(0);
    });
    cy.get('body').type('{esc}');
    cy.get(L.listDialog).should('not.exist');
};
