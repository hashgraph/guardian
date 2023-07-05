import URL from "../../../support/GuardianUrls";

const LogsPageLocators = {
    LogModal: '.cdk-overlay-pane',
    detailsBtn: '.btn-settings',
    apllyBtn: 'button[type="submit"]',
    messageField: '[formcontrolname="message"]',
    messageColumn: '.cdk-column-message .long-message',
    typeSelect: '[formcontrolname="type"]',
    typeDefaultOption: '[formcontrolname="type"] .mat-select-min-line',
    typeOption: '.mat-option-text',
    logType: '.log-type',
    tableBody: 'tbody tr',
    calendarIcon: '[aria-label="Open calendar"]',
    todayDate: '.mat-calendar-body-today',
    attributesSelect: '[formcontrolname="attributes"]',
    attributesInput: '[ng-reflect-placeholder="Attributes"]',
    attributesOption: '[role="option"]',
    attributeReflect: '[ng-reflect-name="attributes"]',
    startDate: '[formcontrolname="startDate"]',
    endDate: '[formcontrolname="endDate"]',
};

export class LogsPage {

    openLogsTab() {
        cy.visit(URL.Root + URL.Logs);
    }

    openDetailsModal() {
        cy.get(LogsPageLocators.detailsBtn).first().click();
    }

    verifyLogModalIsDisplayed() {
        cy.get(LogsPageLocators.LogModal).should('be.visible');
        cy.contains("Log Details").should('be.visible');
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
        cy.wait(500);
    }

    verifyIfMessageColumnContains(message) {
        cy.get(LogsPageLocators.messageColumn).each(($el) => {
            cy.wrap($el).contains(message);
        });
    }

    selectMessageType(type) {
        cy.get(LogsPageLocators.typeSelect).click();
        cy.get(LogsPageLocators.typeOption).contains(type).click();
    }

    verifyIfTypeColumnContains(type) {
        cy.get("tbody").then($tbody => {
            if ($tbody.find("tr").length > 0) {   
                cy.get(LogsPageLocators.logType).each(($el) => {
                    cy.wrap($el).contains(type);
                });
            }
        });
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
        cy.get(LogsPageLocators.typeDefaultOption).contains('All').should("be.visible");
    }

    verifyIfDateRangeFieldIsEmpty() {
        cy.get(LogsPageLocators.startDate).should('have.value', '');
        cy.get(LogsPageLocators.endDate).should('have.value', '');
    }

    verifyIfAttributeFieldIsEmpty() {
        cy.get(LogsPageLocators.attributeReflect).should(($element) => {
            expect($element).not.to.have.attr('role', 'listbox');
        });
    }

}