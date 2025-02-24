import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { ArtifactsPage } from "../../pages/artifactsPage";
const artifactsPage = new ArtifactsPage();

import { PoliciesPage } from "../../pages/policiesPage";
const policiesPage = new PoliciesPage();

context("Artifacts", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const name = "aPolicyForTests";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        artifactsPage.openArtifactsTab();
    })

    it("Verify if it possible to Import artifacts from file", () => {
        policiesPage.openPoliciesTab();
        policiesPage.createPolicy();
        policiesPage.fillNewPolicyForm(name);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(name, "Draft");
        artifactsPage.openArtifactsTab();
        artifactsPage.uploadFile("artifactsImport.policy");
        artifactsPage.checkArtifactsTableContains("artifactsImport");
    });


    it("Verify if it possible to delete Imported artifact", () => {
        artifactsPage.deleteArtifact("artifactsImport");
        artifactsPage.checkArtifactsTableIsNotContains("artifactsImport");
    });

});
