import { HomePage } from "../../../pages/homePage";
const homePage = new HomePage();

import { PoliciesPage } from "../../../pages/policiesPage";
const policiesPage = new PoliciesPage();

//doesn't work
// context("Edit Policy. Save As flow", { tags: ['ui'] }, () => {

//     const SRUsername = Cypress.env('SRUser');
//     const name = Math.floor(Math.random() * 999) + "testName";

//     beforeEach(() => {
//         cy.viewport(1920, 1080);
//         home.visit();
//         home.login("StandardRegistry");
//         policies.openPoliciesTab();
//         policies.createPolicy();
//         policies.fillNewPolicyForm(name);
//         policies.openPoliciesTab();
//         policies.checkStatus(name, "Draft");
//         policies.clickEditPolicy(name);
//         policies.waitForEditPage();
//         policies.clickOnButtonByText("Save As");
//     });

//     it("Verify if a modal window appears after clicking on Save as", () => {
//         policies.checkIfModalIsVisibleByText("New Policy");
//         policies.checkButtonInModalIsNotActive("Ok");
//     });

//     it("Verify if a modal window have a validation", () => {
//         policies.verifyIfFieldHasValidation("name");
//         policies.verifyIfFieldHasValidation("policyTag");
//     });

//     it("Verify if save as can be successfully save a policy", () => {
//         policies.fillFieldInModal("name", "testSaveAs");
//         policies.fillFieldInModal("policyTag", "testTag");
//         policies.clickOnButtonByText("Ok");
//         cy.wait(500);
//         policies.waitForLoadingProgress();
//         policies.openPoliciesTab();
//         policies.checkPolicyTableContains("testSaveAs");
//     });
// });
