import {AuthenticationPage} from "../../pages/authentication";
import {ModulesPage} from "../../pages/modules";

const home = new AuthenticationPage();
const modules = new ModulesPage();

describe("Workflow Module Tags", {tags: '@ui'}, () => {
    const moduleName = Math.floor(Math.random() * 999) + "moduleName";
    const tagName = Math.floor(Math.random() * 999) + "tagName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("module creation", () => {
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.createNewModule(moduleName);
    });

    it("add module tag", () => {
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.addTag(tagName);
    });

    it("delete module tag", () => {
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.deleteTag(tagName);
    });
});
