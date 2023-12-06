import {AuthenticationPage} from "../../../pages/authentication";
import {PoliciesPage} from "../../../pages/policies";

const home = new AuthenticationPage();
const policies = new PoliciesPage();

describe("Edit Policy", {tags: '@ui'}, () => {

    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.createPolicyButton();
        policies.fillNewPolicyForm(name);
        policies.openPoliciesTab();
    })

    it("Verify if it possible to edit draft policy", () => {
        policies.checkStatus(name, "Draft");
        policies.clickEditPolicy(name);
        policies.fillFieldInEditPolicyPage("Name", name+"Edited");
        policies.fillFieldInEditPolicyPage("Description", "Description Edited");
        policies.clickSaveButton();
        policies.openPoliciesTab();
        policies.checkPolicyTableContains(name+"Edited");
        policies.checkPolicyTableContains("Description Edited");
    });

    it("Verify if it impossible to edit In Dry Run policy", () => {
        policies.startDryRun(name);
        policies.checkStatus(name, " In Dry Run ");
        policies.clickEditPolicy(name);
        policies.checkFieldInEditPolicyIsNotEditable("Name");
        policies.checkFieldInEditPolicyIsNotEditable("Policy Tag");
        policies.checkFieldInEditPolicyIsNotEditable("Topic Description");
        policies.checkFieldInEditPolicyIsNotEditable("Description");
    });

    it("Verify if it impossible to edit Published policy", () => {
        policies.publishDraftPolicy(name);
        policies.openPoliciesTab();
        policies.checkStatus(name, " Published ");
        policies.clickEditPolicy(name);
        policies.checkFieldInEditPolicyIsNotEditable("Name");
        policies.checkFieldInEditPolicyIsNotEditable("Policy Tag");
        policies.checkFieldInEditPolicyIsNotEditable("Topic Description");
        policies.checkFieldInEditPolicyIsNotEditable("Description");
    });

    it("Verify if fields are still empty after cancel editing", () => {
        policies.checkStatus(name, "Draft");
        policies.clickEditPolicy(name);
        policies.fillFieldInEditPolicyPage("Name", name+"Edited");
        policies.fillFieldInEditPolicyPage("Topic Description", "Topic Description Edited");
        policies.fillFieldInEditPolicyPage("Description", "Description Edited");
        policies.openPoliciesTab();
        policies.clickEditPolicy(name);
        policies.checkPolicyTableFieldIsEmpty("Description");
        policies.checkPolicyTableFieldIsEmpty("Topic Description");
    });

    it("Verify if a modal window appears after returning to editing", () => {
        policies.openPoliciesTab();
        policies.checkStatus(name, "Draft");
        policies.clickEditPolicy(name);
        policies.fillFieldInEditPolicyPage("Tag", "Tag Edited");
        policies.fillFieldInEditPolicyPage("Title", "Title Edited");
        policies.openPoliciesTab();
        policies.clickEditPolicy(name);
        policies.checkModalWindowIsVisible("Apply latest changes");
        policies.checkModalWindowIsVisible("Do you want to apply latest changes?");
        policies.checkPolicyTableFieldIsEmpty("Description");
        policies.checkPolicyTableFieldIsEmpty("Topic Description");
    });

    it("Adding new blocks on edit policy page", () => {
        policies.checkStatus(name, "Draft");
        policies.clickEditPolicy(name);
        policies.waitForEditPage();
        policies.addNewBlockByName("Action");
        policies.addNewBlockByName("Filters Addon");
        policies.clickSaveButton();
        policies.openPoliciesTab();
        policies.clickEditPolicy(name);
        policies.checkBlockIsPresent("Block_1");
        policies.checkBlockIsPresent("Block_2");
    });

    it("Modify Existing block and validate if changes are saved", () => {
        policies.checkStatus(name, "Draft");
        policies.clickEditPolicy(name);
        policies.waitForEditPage();
        policies.addNewBlockByName("Action");
        policies.addNewBlockByName("Aggregate Data");
        policies.clickOnAddedBlock("Block_1");
        policies.addNewBlockByName("Filters Addon");
        policies.addNewBlockByName("History");
        policies.clickSaveButton();
        policies.openPoliciesTab();
        policies.clickEditPolicy(name);
        policies.expandBlock("Block_1");
        policies.checkBlockIsPresent("Block_3");
        policies.checkBlockIsPresent("Block_4");
    });

    it("Delete existing block and validate if changes are saved", () => {
        policies.checkStatus(name, "Draft");
        policies.clickEditPolicy(name);
        policies.waitForEditPage();
        policies.addNewBlockByName("Action");
        policies.addNewBlockByName("Aggregate Data");
        policies.clickOnAddedBlock("Block_1");
        policies.clickOnDeleteBlockButton();
        policies.clickSaveButton();
        policies.openPoliciesTab();
        policies.clickEditPolicy(name);
        policies.checkBlockIsPresent("Block_2");
    });
});
