import { HomePage } from "../../../pages/homePage";
const homePage = new HomePage();

import { PoliciesPage } from "../../../pages/policiesPage";
const policiesPage = new PoliciesPage();

// context("Edit Policy. Udo/Redo flow", { tags: ['ui'] }, () => {

//     const SRUsername = Cypress.env('SRUser');
//     const name = Math.floor(Math.random() * 999) + "testName";

//     beforeEach(() => {
//         cy.viewport(1920, 1080);
//         homePage.visit();
//         homePage.login(SRUsername);
//         policiesPage.openPoliciesTab();
//     });

//     it("Verify if it possible to cancel action by Undo/move forward by Redo", () => {
//         policiesPage.createPolicy();
//         policiesPage.fillNewPolicyForm(name);
//         policiesPage.backToPoliciesList();
//         policiesPage.checkStatus(name, "Draft");
//         policiesPage.openEditingPolicy(name);
//         policiesPage.addNewBlock("Create Token");
//         policiesPage.checkBlockExists("Block_1");
//         policiesPage.undo();
//         policiesPage.checkBlockNotExist("Block_1");
//         policiesPage.redo();
//         policiesPage.checkBlockExists("Block_1");
//     });

//     after(() => {
//         policiesPage.backToPoliciesList();
//         policiesPage.deletePolicy(name);
//     });
// });
