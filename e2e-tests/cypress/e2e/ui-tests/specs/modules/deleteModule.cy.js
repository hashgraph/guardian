import {AuthenticationPage} from "../../pages/authentication";
import {ModulesPage} from "../../pages/modules";

const home = new AuthenticationPage();
const modules = new ModulesPage();

describe("Workflow Modules Deletion", {tags: '@ui'}, () => {

    const moduleName = Math.floor(Math.random() * 999) + "moduleName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("module creation", () => {
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.createNewModule(moduleName);
    });

    it("module deletion", () => {
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.deleteModule(moduleName);
    });
});
