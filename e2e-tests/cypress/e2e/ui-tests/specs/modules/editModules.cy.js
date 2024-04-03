import {AuthenticationPage} from "../../pages/authentication";
import {ModulesPage} from "../../pages/modules";
import {PoliciesPage} from "../../pages/policies";

const home = new AuthenticationPage();
const modules = new ModulesPage();
const policies = new PoliciesPage();

describe("Edit Modules", {tags: '@ui'}, () => {

    const name = Math.floor(Math.random() * 999) + "moduleName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        modules.openModulesTab();
        modules.createNewModule(name);
    })

    it("Verify if it possible to edit module", () => {
        policies.checkStatus(name, "Draft");
        modules.clickEditModule(name);
        policies.fillFieldInEditPolicyPage("Name", name+"Edited");
        policies.fillFieldInEditPolicyPage("Description", "Description Edited");
        policies.clickSaveButton();
        modules.openModulesTab();
        policies.checkPolicyTableContains(name+"Edited");
        policies.checkPolicyTableContains("Description Edited");
    });

    it("Verify if it impossible to edit Published module", () => {
        modules.publishModule(name);
        policies.checkStatus(name, "Published");
        policies.clickEditPolicy(name);
        policies.clickOnButtonByText("Save");
        modules.checkTheTextIsPresentInModule("Module published");
    });

    it("Verify if a modal window appears after returning to editing module", () => {
        policies.checkStatus(name, "Draft");
        policies.clickEditPolicy(name);
        policies.fillFieldInEditPolicyPage("Name", name+"Edited");
        policies.fillFieldInEditPolicyPage("Description", "Description Edited");
        modules.openModulesTab();
        policies.clickEditPolicy(name);
        policies.checkModalWindowIsVisible("Apply latest changes");
        policies.checkModalWindowIsVisible("Do you want to apply latest changes?");
    });

    it("Adding new blocks on edit module page", () => {
        policies.checkStatus(name, "Draft");
        policies.clickEditPolicy(name);
        policies.waitForEditPage();
        policies.addNewBlockByName("Action");
        policies.addNewBlockByName("Filters Addon");
        policies.clickSaveButton();
        modules.openModulesTab();
        policies.clickEditPolicy(name);
        policies.checkBlockIsPresent("Block_1");
        policies.checkBlockIsPresent("Block_2");
    });

    it("Modify Existing block and validate if changes are saved on edit module page", () => {
        policies.checkStatus(name, "Draft");
        policies.clickEditPolicy(name);
        policies.waitForEditPage();
        policies.addNewBlockByName("Action");
        policies.addNewBlockByName("Aggregate Data");
        policies.clickOnAddedBlock("Block_1");
        policies.addNewBlockByName("Filters Addon");
        policies.addNewBlockByName("History");
        policies.clickSaveButton();
        modules.openModulesTab();
        policies.clickEditPolicy(name);
        policies.expandBlock("Block_1");
        policies.checkBlockIsPresent("Block_3");
        policies.checkBlockIsPresent("Block_4");
    });

    it("Delete existing block and validate if changes are saved on edit module page", () => {
        policies.checkStatus(name, "Draft");
        policies.clickEditPolicy(name);
        policies.waitForEditPage();
        policies.addNewBlockByName("Action");
        policies.addNewBlockByName("Aggregate Data");
        policies.clickOnAddedBlock("Block_1");
        policies.clickOnDeleteBlockButton();
        policies.clickSaveButton();
        modules.openModulesTab();
        policies.clickEditPolicy(name);
        policies.checkBlockIsPresent("Block_2");
    });
});
