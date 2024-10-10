import {AuthenticationPage} from "../../pages/authentication";
import {ModulesPage} from "../../pages/modules";
import {PoliciesPage} from "../../pages/policies";

const home = new AuthenticationPage();
const modules = new ModulesPage();
const policies = new PoliciesPage();

describe("Import Modules", {tags: '@ui'}, () => {

    const name = Math.floor(Math.random() * 999) + "moduleName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        modules.openModulesTab();
    })

    it("Verify if it possible to Import published module from file", () => {
        policies.clickOnButtonByText("Import");
        policies.clickOnButtonByTextInModal("Import from file");
        policies.uploadFile("importPublichedModule.module");
        policies.checkPolicyTableContains("730moduleName");
    });

    it("Verify if it possible to Import published module from IPFS", () => {
        policies.clickOnButtonByText("Import");
        policies.clickOnButtonByTextInModal("Import from IPFS");
        policies.fillImportIPFSForm("1686824167.992034707");
        policies.checkPolicyTableContains("730moduleName");
    });

    it("Verify if it possible to Import draft module from file", () => {
        policies.clickOnButtonByText("Import");
        policies.clickOnButtonByTextInModal("Import from file");
        policies.uploadFile("importDraftModule.module");
        policies.checkPolicyTableContains("importAutomationTest");
    });
});
