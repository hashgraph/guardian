import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

context("Edit Policy. Validation flow", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
    });

    it("Checking for successful validation", () => {
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.openEditingPolicy(name);
        policiesPage.clickOnButtonByText("Validation");
        policiesPage.verifyIfValidationIsSuccessful();
    });

    it("Verify that the validation is displayed successfully", () => {
        policiesPage.openEditingPolicy(name);
        policiesPage.addNewBlock("Action");
        policiesPage.clickOnButtonByText("Validation");
        policiesPage.verifyIfValidationIsDisplayed();
    });

    it("Verify that the validation count is working successfully", () => {
        policiesPage.openEditingPolicy(name);
        policiesPage.addNewBlock("Action");
        policiesPage.addNewBlock("Button");
        policiesPage.clickOnButtonByText("Validation");
        policiesPage.verifyIfValidationCountContains(2);
    });

    after(() => {
        policiesPage.backToPoliciesList();
        policiesPage.deletePolicy(name);
    });
});
