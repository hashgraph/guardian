import {AuthenticationPage} from "../../pages/authentication";
import {ModulesPage} from "../../pages/modules";

const home = new AuthenticationPage();
const modules = new ModulesPage();

describe("Workflow Modules Export", {tags: '@ui'}, () => {

    const moduleName = Math.floor(Math.random() * 999) + "moduleNameForExportFile";
    const moduleName2 = Math.floor(Math.random() * 999) + "moduleNameForExportIPFS";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("module file export", () => {
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.createNewModule(moduleName);
        modules.exportFile(moduleName);
    });

    it("module ipfs export", () => {
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.createNewModule(moduleName2);
        modules.publishModule(moduleName2);
        modules.exportIPFS(moduleName2);
    });
});
