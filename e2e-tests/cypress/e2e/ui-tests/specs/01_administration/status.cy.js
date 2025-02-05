import { HomePage } from "../../pages/homepage";
const homepage = new HomePage();

import {StatusPage} from "../../pages/status";
const status = new StatusPage();


context("Verify status of services", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        status.openStatusTab();
    })

    it("Verify if all services are running successfully on status page", () => {
        status.verifyIfServicesIsRunning();
    });

});
