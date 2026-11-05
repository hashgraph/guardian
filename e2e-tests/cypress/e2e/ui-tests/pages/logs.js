import URL from '../../../support/GuardianUrls';
import { waitForPageReady } from '../../../support/pageReadiness';

const LogsPageLocators = {
    LogModal: 'div.p-dialog',
    detailsButton: 'button:contains("Details")',
    apllyBtn: 'button[label="Apply"]',
    messageField: '[placeholder="Message"]',
    logData: 'tr.guardian-grid-row',
    typeSelect: 'p-select.message-type-container',
    typeDefaultOption: '[aria-label="Message Type"]',
    typeOption: '.p-select-option',
    logType: '.log-type',
    tableBody: 'tbody tr',
    calendarIcon: 'button.p-datepicker-trigger',
    todayDate: '.p-datepicker-today>span',
    attributesSelect: 'p-multiselect[placeholder="Attributes"]',
    attributesInput: '[ng-reflect-placeholder="Attributes"]',
    attributesOption: '.p-multiselect-option',
    startDate: '[formcontrolname="startDate"]',
    endDate: '[formcontrolname="endDate"]',
};

export class LogsPage {

    openLogsTab() {
        cy.visit(URL.Root + URL.Logs);
        waitForPageReady(LogsPageLocators.messageField);
    }

    openDetailsModal() {
        cy.get(LogsPageLocators.detailsButton).first().click();
    }

    verifyLogModalIsDisplayed() {
        cy.get(LogsPageLocators.LogModal).should('be.visible');
        cy.contains('Details Log').should('be.visible');
        cy.get('[formcontrolname="type"]').should('be.visible');
        cy.get('[formcontrolname="datetime"]').should('be.visible');
        cy.get('[formcontrolname="message"]').should('be.visible');
        cy.get('[formcontrolname="attributes"]').should('be.visible');
    }

    fillMessageField(message) {
        cy.get(LogsPageLocators.messageField).type(message);
    }

    clickOnApplyButton() {
        cy.get(LogsPageLocators.apllyBtn).click();
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- brief settle for the table refetch after Apply; the following assertions retry on their own, this only keeps the first poll tight
        cy.wait(500);
    }

    verifyIfMessageColumnContains(message) {
        cy.get(LogsPageLocators.logData).each(($el) => {
            cy.wrap($el).find('td').eq(2).contains(message);
        });
    }

    selectMessageType(type) {
        cy.get(LogsPageLocators.typeSelect).click();
        cy.get(LogsPageLocators.typeOption).contains(type).click();
    }

    verifyIfTypeColumnContains(type) {
        cy.get('body').then(($body) => {
            if ($body.find(LogsPageLocators.logData).length !== 0)
                {cy.wrap($body).find(LogsPageLocators.logData).each($element => {
                    cy.wrap($element).find('td').eq(0).contains(type);
                });}
        })
    }

    openDateRangePicker() {
        cy.get(LogsPageLocators.calendarIcon).click();
    }

    selectTodayDate() {
        cy.get(LogsPageLocators.todayDate).click();
        cy.get(LogsPageLocators.todayDate).click();
    }

    selectFirstOptionInAttributes() {
        cy.get(LogsPageLocators.attributesSelect).click();
        cy.get(LogsPageLocators.attributesOption).first().click();
    }

    verifyThatLogsTableIsNotEmpty() {
        cy.get(LogsPageLocators.tableBody).should('not.be.empty');
    }

    clickOnButton(buttonName) {
        cy.contains(buttonName).click();
    }

    verifyIfMessageFieldIsEmpty() {
        cy.get(LogsPageLocators.messageField).should('have.value', '');
    }

    verifyIfTypeFieldHasDefaultValue() {
        cy.get(LogsPageLocators.typeDefaultOption).should('exist');
    }

    verifyIfDateRangeFieldIsEmpty() {
        cy.get(LogsPageLocators.startDate).should('have.value', '');
        cy.get(LogsPageLocators.endDate).should('have.value', '');
    }

    verifyIfAttributeFieldIsEmpty() {
        // With no selection the multiselect label falls back to its "Attributes" placeholder.
        cy.get(LogsPageLocators.attributesSelect)
            .find('.p-multiselect-label')
            .should('contain.text', 'Attributes');
    }

}
