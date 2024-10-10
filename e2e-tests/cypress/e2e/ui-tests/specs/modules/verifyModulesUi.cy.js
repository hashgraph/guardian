import {AuthenticationPage} from "../../pages/authentication";
import {ModulesPage} from "../../pages/modules";

const home = new AuthenticationPage();
const modules = new ModulesPage();

describe("Verify Modules UI", {tags: '@ui'}, () => {

    const moduleName = Math.floor(Math.random() * 999) + "moduleName";
    const moduleName2 = Math.floor(Math.random() * 999) + "moduleName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("verify ui", () => {
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.createNewModule(moduleName);
        modules.createNewModule(moduleName2);
        modules.publishModule(moduleName);

        modules.verifyButtonsAndHeaders();
        modules.verifyPublishedModuleDataAndActions(moduleName);
        modules.verifyDraftModuleDataAndActions(moduleName2);
    });
});
