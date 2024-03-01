import URL from "../../../support/GuardianUrls";

const StatusPageLocators = {
    serviceStatusElement: (value) => `//*[contains(text(), '${value}')]/../../td//mat-icon`,
};

export class StatusPage {

    openStatusTab() {
        cy.visit(URL.Root + URL.Status);
    }

    verifyIfServiceIsRunning(serviceName) {
        cy.contains(serviceName)
        .parent()
        .parent()
        .find('div[ng-reflect-ng-switch="READY"]');
    }

}
