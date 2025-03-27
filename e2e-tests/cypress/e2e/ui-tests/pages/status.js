import URL from "../../../support/GuardianUrls";
import CommonElements from "../../../support/defaultUIElements";

const StatusPageLocators = {
    serviceStatusElement: (value) => `//*[contains(text(), '${value}')]/../../td//mat-icon`,
};

export class StatusPage {

    openStatusTab() {
        cy.get(CommonElements.navBar).contains(CommonElements.administrationTab).click()
        cy.get(CommonElements.navBar).contains(CommonElements.statusTab).click()
    }

    verifyIfServicesIsRunning() {
        cy.contains("GUARDIAN_SERVICE").parent().parent().find('div[ng-reflect-ng-switch="READY"]');
        cy.contains("AUTH_SERVICE").parent().parent().find('div[ng-reflect-ng-switch="READY"]');
        cy.contains("WORKER").parent().parent().find('div[ng-reflect-ng-switch="READY"]');
        cy.contains("POLICY_SERVICE").parent().parent().find('div[ng-reflect-ng-switch="READY"]');
        cy.contains("NOTIFICATION_SERVICE").parent().parent().find('div[ng-reflect-ng-switch="READY"]');
        cy.contains("LOGGER_SERVICE").parent().parent().find('div[ng-reflect-ng-switch="READY"]');
        cy.contains("QUEUE").parent().parent().find('div[ng-reflect-ng-switch="READY"]');
    }

}
