import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { ArtifactsPage } from "../../pages/artifactsPage";
const artifactsPage = new ArtifactsPage();

context("Artifacts", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.login(SRUsername);
        artifactsPage.openArtifactsTab();
    })

    it("Verify if it possible to Import artifacts from file", () => {
        artifactsPage.uploadFile("artifactsImport.policy");
        artifactsPage.checkArtifactsTableContains("artifactsImport");
    });


    it("Verify if it possible to delete Imported artifact", () => {
        artifactsPage.deleteArtifact("artifactsImport");
        artifactsPage.checkArtifactsTableIsNotContains("artifactsImport");
    });

});
