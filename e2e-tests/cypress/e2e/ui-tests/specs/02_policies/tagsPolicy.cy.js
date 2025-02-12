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
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
    })

    it("Verify if it possible to add tags", () => {
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        policiesPage.createTag(name, "tag1");
        policiesPage.createTag(name, "tag2");
    });

    it("Verify if it possible to delete tags", () => {
        policiesPage.checkStatus(name, "Draft");
        policiesPage.deleteTag(name, "tag1");
        policiesPage.deleteTag(name, "tag2");
    });

    after(() => {
        policiesPage.openPoliciesTab();
        policiesPage.deletePolicy(name);
    });
});