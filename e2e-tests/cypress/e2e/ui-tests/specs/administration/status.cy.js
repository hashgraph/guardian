import {AuthenticationPage} from "../../pages/authentication";
import {StatusPage} from "../../pages/status";

const home = new AuthenticationPage();
const status = new StatusPage();

describe("Verify status of services", {tags: '@ui'}, () => {

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        status.openStatusTab();
    })

    it("Verify if all services are running successfully on status page", () => {
        status.verifyIfServiceIsRunning("LOGGER_SERVICE");
        status.verifyIfServiceIsRunning("GUARDIAN_SERVICE");
        status.verifyIfServiceIsRunning("AUTH_SERVICE");
        status.verifyIfServiceIsRunning("WORKER");
        status.verifyIfServiceIsRunning("POLICY_SERVICE");
    });

});
