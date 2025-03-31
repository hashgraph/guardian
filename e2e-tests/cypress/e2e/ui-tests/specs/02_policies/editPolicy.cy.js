import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

context("Edit Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = Math.floor(Math.random() * 999) + "testName";
    let newName;

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
        newName = name + "Edited";
        policiesPage.editPolicyProperty("Name", newName);
        policiesPage.editPolicyProperty("Description", "Description Edited");
        policiesPage.savePolicyEditing();
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(newName, "Draft");
        policiesPage.verifyPolicyProperty(newName, "Description", "Description Edited");
    });

    it("Verify if it impossible to edit In Dry Run policy", () => {
        policiesPage.startDryRun(newName);
        policiesPage.checkStatus(newName, "In Dry Run");
        policiesPage.openEditingPolicy(newName);
        policiesPage.checkFieldsInEditPolicyIsNotEditable(newName);
    });

    it("Verify if it impossible to edit Published policy", () => {
        policiesPage.publishPolicy(newName);
        policiesPage.openPoliciesTab();
        policiesPage.checkStatus(newName, "Published");
        policiesPage.openEditingPolicy(newName);
        policiesPage.checkFieldsInEditPolicyIsNotEditable(newName);
    });

    it("Verify if fields are still empty after cancel editing", () => {
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.openEditingPolicy(name);
        policiesPage.editPolicyProperty("Name", name + "Edited2");
        policiesPage.editPolicyProperty("Description", "Description Edited");
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.verifyPolicyProperty(name, "Description", "");
    });

    //TBD: doesn't work; only after validation
    // it("Verify if a modal window appears after returning to editing", () => {
    //     policiesPage.openPoliciesTab();
    //     policiesPage.checkStatus(name, "Draft");
    //     policiesPage.clickEditPolicy(name);
    //     policiesPage.fillFieldInEditPolicyPage("Tag", "Tag Edited");
    //     policiesPage.fillFieldInEditPolicyPage("Title", "Title Edited");
    //     policiesPage.openPoliciesTab();
    //     policiesPage.clickEditPolicy(name);
    //     policiesPage.checkModalWindowIsVisible("Apply latest changes");
    //     policiesPage.checkModalWindowIsVisible("Do you want to apply latest changes?");
    //     policiesPage.checkPolicyTableFieldIsEmpty("Description");
    //     policiesPage.checkPolicyTableFieldIsEmpty("Topic Description");
    // });

    it("Adding new blocks on edit policy page", () => {
        policiesPage.checkStatus(name, "Draft");
        policiesPage.openEditingPolicy(name);
        policiesPage.addNewBlock("Action");
        policiesPage.addNewBlock("Filters Addon");
        policiesPage.savePolicyEditing();
        policiesPage.backToPoliciesList();
        policiesPage.openEditingPolicy(name);
        policiesPage.checkBlockExists("Block_1");
        policiesPage.checkBlockExists("Block_2");
    });

    it("Modify Existing block and validate if changes are saved", () => {
        policiesPage.checkStatus(name, "Draft");
        policiesPage.openEditingPolicy(name);
        policiesPage.editBlockName("Block_1", "Block_12");
        policiesPage.clickOnBlock("Block_2");
        policiesPage.addNewBlock("Filters Addon");
        policiesPage.addNewBlock("History");
        policiesPage.savePolicyEditing();
        policiesPage.backToPoliciesList();
        policiesPage.openEditingPolicy(name);
        policiesPage.checkBlockExists("Block_12");
        policiesPage.expandBlock("Block_2");
        policiesPage.checkBlockExists("Block_2");
        policiesPage.checkBlockExists("Block_3");
        policiesPage.checkBlockExists("Block_1");
    });

    it("Delete existing block and validate if changes are saved", () => {
        policiesPage.checkStatus(name, "Draft");
        policiesPage.openEditingPolicy(name);
        policiesPage.clickOnBlock("Block_12");
        policiesPage.clickOnDeleteBlockButton();
        policiesPage.savePolicyEditing();
        policiesPage.backToPoliciesList();
        policiesPage.openEditingPolicy(name);
        policiesPage.checkBlockNotExist("Block_12");
    });

    after(() => {
        policiesPage.backToPoliciesList();
        policiesPage.deletePolicy(name);
    });
});
