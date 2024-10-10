import {AuthenticationPage} from "../../pages/authentication";
import {ModulesPage} from "../../pages/modules";
import {PoliciesPage} from "../../pages/policies";

const home = new AuthenticationPage();
const modules = new ModulesPage();
const policies = new PoliciesPage();

describe("Workflow Modules Export", {tags: '@ui'}, () => {

    const moduleName = Math.floor(Math.random() * 999) + "moduleNameForExportFile";
    const moduleName2 = Math.floor(Math.random() * 999) + "moduleNameForExportIPFS";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    });

    it("Verify if it impossible to Export draft module using message identifier", () => {
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.createNewModule(moduleName);
        policies.checkStatus(moduleName, "Draft");
        policies.clickOnExportButton(moduleName);
        policies.checkButtonInModalIsNotActive("Copy message identifier");
    });

    it("Verify if it possible to Export published module using message identifier", () => {
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.createNewModule(moduleName);
        modules.publishModule(moduleName);
        policies.clickOnExportButton(moduleName);
        policies.checkButtonInModalIsActive("Copy message identifier");
    });

    it("Verify if it possible to Export draft module using file", () => {
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.createNewModule(moduleName);
        policies.checkStatus(moduleName, "Draft");
        policies.clickOnExportButton(moduleName);
        policies.clickOnButtonByTextInModal("Save to file");
        cy.wait(1000);
        cy.checkIfFileExistByPartialName("module");
    });

    it("Verify if it possible to Export published module using file", () => {
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.createNewModule(moduleName);
        modules.publishModule(moduleName);
        policies.clickOnExportButton(moduleName);
        policies.clickOnButtonByTextInModal("Save to file");
        cy.wait(1000);
        cy.checkIfFileExistByPartialName("module");
    });
});
