import URL from '../../../support/GuardianUrls';
import { waitForPageReady } from '../../../support/pageReadiness';

const StatusPageLocators = {
    serviceCard: '.item .header span',
    serviceStatusElement: (value) => `//*[contains(text(), '${value}')]/../../td//mat-icon`,
};

export class StatusPage {

    openStatusTab() {
        cy.visit(URL.Root + URL.Status);
        waitForPageReady(StatusPageLocators.serviceCard);
    }

    verifyIfServicesIsRunning() {
        const services = [
            'GUARDIAN_SERVICE',
            'AUTH_SERVICE',
            'WORKER',
            'POLICY_SERVICE',
            'NOTIFICATION_SERVICE',
            'LOGGER_SERVICE',
            'QUEUE',
        ];
        services.forEach((serviceName) => {
            // The status page renders one card per service; every running state shows
            // the green check icon (svgClass="success-color").
            cy.contains(StatusPageLocators.serviceCard, serviceName)
                .parents('.item')
                .find('svg-icon[src="/assets/images/icons/check.svg"]')
                .should('exist');
        });
    }

}
