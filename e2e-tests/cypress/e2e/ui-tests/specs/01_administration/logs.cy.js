import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { LogsPage } from "../../pages/logs";
const logs = new LogsPage();

context("Check logs page", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        logs.openLogsTab();
    })

    it("Verify if it possible to see log details on logs page", () => {
        logs.openDetailsModal();
        logs.verifyLogModalIsDisplayed();
    });

    it("Verify if it possible to filter by message", () => {
        logs.fillMessageField("Task completed");
        logs.clickOnApplyButton();
        logs.verifyIfMessageColumnContains("Task completed");
    });

    it("Verify if it possible to filter by message type", () => {
        logs.selectMessageType("Error");
        logs.clickOnApplyButton();
        logs.verifyIfTypeColumnContains("ERROR");
        logs.selectMessageType("Info");
        logs.clickOnApplyButton();
        logs.verifyIfTypeColumnContains("INFO");
        logs.selectMessageType("Warn");
        logs.clickOnApplyButton();
        logs.verifyIfTypeColumnContains("WARN");
    });

    it("Verify if it possible to filter by data attributes", () => {
        logs.selectFirstOptionInAttributes();
        logs.clickOnApplyButton();
        logs.verifyThatLogsTableIsNotEmpty();
    });

    it("Verify if it possible to save logs", () => {
        logs.clickOnButton("Save logs");
        cy.wait(2000);
        cy.checkIfFileExistByPartialName("logs");
    });

    it("Verify if it possible to clear filter", () => {
        logs.fillMessageField("Task completed");
        logs.selectMessageType("Error");
        logs.selectFirstOptionInAttributes();
        logs.clickOnButton("Clear filters");
        logs.verifyIfMessageFieldIsEmpty();
        logs.verifyIfTypeFieldHasDefaultValue();
        logs.verifyIfAttributeFieldIsEmpty();
    });

    //TBD: datepickers don't work on logs page
    // it("Verify if it possible to filter by data range", () => {
    //     logs.openDateRangePicker();
    //     logs.selectTodayDate();
    //     logs.clickOnApplyButton();
    // });
});
