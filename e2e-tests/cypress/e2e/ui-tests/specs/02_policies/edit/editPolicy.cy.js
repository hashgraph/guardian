import { HomePage } from "../../../pages/homePage";
const homePage = new HomePage();

import { PoliciesPage } from "../../../pages/policiesPage";
const policiesPage = new PoliciesPage();

context("Edit Policy", { tags: ['ui'] }, () => {

    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
    })

    it("Verify if it possible to edit draft policy", () => {
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.openEditingPolicy(name);


        policiesPage.fillFieldInEditPolicyPage("Name", name+"Edited");
        policiesPage.fillFieldInEditPolicyPage("Description", "Description Edited");
        policiesPage.clickSaveButton();
        policiesPage.openPoliciesTab();
        policiesPage.checkPolicyTableContains(name+"Edited");
        policiesPage.checkPolicyTableContains("Description Edited");
    });

    it("Verify if it impossible to edit In Dry Run policy", () => {
        policiesPage.startDryRun(name);
        policiesPage.checkStatus(name, " In Dry Run ");
        policiesPage.clickEditPolicy(name);
        policiesPage.checkFieldInEditPolicyIsNotEditable("Name");
        policiesPage.checkFieldInEditPolicyIsNotEditable("Policy Tag");
        policiesPage.checkFieldInEditPolicyIsNotEditable("Topic Description");
        policiesPage.checkFieldInEditPolicyIsNotEditable("Description");
    });

    it("Verify if it impossible to edit Published policy", () => {
        policiesPage.publishDraftPolicy(name);
        policiesPage.openPoliciesTab();
        policiesPage.checkStatus(name, " Published ");
        policiesPage.clickEditPolicy(name);
        policiesPage.checkFieldInEditPolicyIsNotEditable("Name");
        policiesPage.checkFieldInEditPolicyIsNotEditable("Policy Tag");
        policiesPage.checkFieldInEditPolicyIsNotEditable("Topic Description");
        policiesPage.checkFieldInEditPolicyIsNotEditable("Description");
    });

    it("Verify if fields are still empty after cancel editing", () => {
        policiesPage.checkStatus(name, "Draft");
        policiesPage.clickEditPolicy(name);
        policiesPage.fillFieldInEditPolicyPage("Name", name+"Edited");
        policiesPage.fillFieldInEditPolicyPage("Topic Description", "Topic Description Edited");
        policiesPage.fillFieldInEditPolicyPage("Description", "Description Edited");
        policiesPage.openPoliciesTab();
        policiesPage.clickEditPolicy(name);
        policiesPage.checkPolicyTableFieldIsEmpty("Description");
        policiesPage.checkPolicyTableFieldIsEmpty("Topic Description");
    });

    it("Verify if a modal window appears after returning to editing", () => {
        policiesPage.openPoliciesTab();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.clickEditPolicy(name);
        policiesPage.fillFieldInEditPolicyPage("Tag", "Tag Edited");
        policiesPage.fillFieldInEditPolicyPage("Title", "Title Edited");
        policiesPage.openPoliciesTab();
        policiesPage.clickEditPolicy(name);
        policiesPage.checkModalWindowIsVisible("Apply latest changes");
        policiesPage.checkModalWindowIsVisible("Do you want to apply latest changes?");
        policiesPage.checkPolicyTableFieldIsEmpty("Description");
        policiesPage.checkPolicyTableFieldIsEmpty("Topic Description");
    });

    it("Adding new blocks on edit policy page", () => {
        policiesPage.checkStatus(name, "Draft");
        policiesPage.clickEditPolicy(name);
        policiesPage.waitForEditPage();
        policiesPage.addNewBlockByName("Action");
        policiesPage.addNewBlockByName("Filters Addon");
        policiesPage.clickSaveButton();
        policiesPage.openPoliciesTab();
        policiesPage.clickEditPolicy(name);
        policiesPage.checkBlockIsPresent("Block_1");
        policiesPage.checkBlockIsPresent("Block_2");
    });

    it("Modify Existing block and validate if changes are saved", () => {
        policiesPage.checkStatus(name, "Draft");
        policiesPage.clickEditPolicy(name);
        policiesPage.waitForEditPage();
        policiesPage.addNewBlockByName("Action");
        policiesPage.addNewBlockByName("Aggregate Data");
        policiesPage.clickOnAddedBlock("Block_1");
        policiesPage.addNewBlockByName("Filters Addon");
        policiesPage.addNewBlockByName("History");
        policiesPage.clickSaveButton();
        policiesPage.openPoliciesTab();
        policiesPage.clickEditPolicy(name);
        policiesPage.expandBlock("Block_1");
        policiesPage.checkBlockIsPresent("Block_3");
        policiesPage.checkBlockIsPresent("Block_4");
    });

    it("Delete existing block and validate if changes are saved", () => {
        policiesPage.checkStatus(name, "Draft");
        policiesPage.clickEditPolicy(name);
        policiesPage.waitForEditPage();
        policiesPage.addNewBlockByName("Action");
        policiesPage.addNewBlockByName("Aggregate Data");
        policiesPage.clickOnAddedBlock("Block_1");
        policiesPage.clickOnDeleteBlockButton();
        policiesPage.clickSaveButton();
        policiesPage.openPoliciesTab();
        policiesPage.clickEditPolicy(name);
        policiesPage.checkBlockIsPresent("Block_2");
    });
});
