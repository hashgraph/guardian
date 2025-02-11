import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

context("Tags Policy", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    it("Verify if it possible to add tags", () => {
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.createTag(name, "tag1");
        policiesPage.createTag(name, "tag2");
    });

    it("Verify if it possible to delete tags", () => {
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.deleteTag(name, "tag1");
        policiesPage.deleteTag(name, "tag2");
    });
});