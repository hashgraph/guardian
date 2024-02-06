import {AuthenticationPage} from "../../pages/authentication";
import {SettingsPage} from "../../pages/settings";

const home = new AuthenticationPage();
const settings = new SettingsPage();

describe("Check settings page", {tags: '@ui'}, () => {

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        settings.openSettingsTab();
    })

    it("Verify if all fields have a validation on settings page", () => {
        settings.verifyIfFieldHasValidation("operatorId", "1");
        settings.verifyIfFieldHasValidation("operatorKey", "2");
        settings.verifyIfFieldHasValidation("ipfsStorageApiKey", "3");
    });

});
