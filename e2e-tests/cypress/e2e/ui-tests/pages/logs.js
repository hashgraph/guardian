import URL from "../../../support/GuardianUrls";
import CommonElements from "../../../support/defaultUIElements";

const LogsPageLocators = {
    LogModal: 'div.p-dialog',
    detailsButton: "Details",
    apllyBtn: 'button[label="Apply"]',
    messageField: '[placeholder="Message"]',
    logData: 'tr.row-item',
    typeSelect: '[ng-reflect-name="type"]',
    typeDefaultOption: '[aria-label="Message Type"]',
    typeOption: '.mat-option-text',
    logType: '.log-type',
    tableBody: 'tbody tr',
    calendarIcon: 'button.p-datepicker-trigger',
    todayDate: '.p-datepicker-today>span',
    attributesSelect: '[formcontrolname="attributes"]',
    attributesInput: '[ng-reflect-placeholder="Attributes"]',
    attributesOption: 'p-multiselectitem[ng-reflect-option]',
    attributeReflect: '[ng-reflect-name="attributes"]',
    startDate: '[formcontrolname="startDate"]',
    endDate: '[formcontrolname="endDate"]',
};

export class LogsPage {

    openLogsTab() {
        cy.get(CommonElements.navBar).contains(CommonElements.administrationTab).click();
        cy.get(CommonElements.navBar).contains(CommonElements.logsTab).click();
    }

    openDetailsModal() {
        cy.contains(LogsPageLocators.detailsButton).first().click();
    }

    verifyLogModalIsDisplayed() {
        cy.get(LogsPageLocators.LogModal).should('be.visible');
        cy.contains("Details Log").should('be.visible');
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
        cy.get(LogsPageLocators.logData).each(($el) => {
            cy.wrap($el).find('td').eq(2).contains(message);
        });
    }

    selectMessageType(type) {
        cy.get(LogsPageLocators.typeSelect).click();
        cy.contains(type).click();
    }

    verifyIfTypeColumnContains(type) {
        cy.get("body").then(($body) => {
            if ($body.find(LogsPageLocators.logData).length != 0)
                cy.wrap($body).find(LogsPageLocators.logData).each($element => {
                    cy.wrap($element).find('td').eq(0).contains(type);
                });
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
        cy.get(LogsPageLocators.typeDefaultOption).should("exist");
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
