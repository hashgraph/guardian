import ASSERT from "../../../support/CustomHelpers/assertions";
import TIMEOUTS from "../../../support/CustomHelpers/timeouts";
import URL from "../../../support/GuardianUrls";

const ArtifactsPageLocators = {
    modalWindow: 'mat-dialog-container[id*="mat-dialog"]',
    uploadFileInput: '[dropzoneclassname="file-drop-zone"] input[type="file"]',
    artifactsList: "/api/v1/artifacts?pageIndex=0&pageSize=100&type=policy",
    dialogContainer: '.mat-dialog-container',
};

export class ArtifactsPage {

    openArtifactsTab() {
        cy.visit(URL.Root + URL.Artifacts);
    }

    openAndVerifyArtifactsTab() {
        cy.intercept(ArtifactsPageLocators.artifactsList).as(
            "waitForArtifactsList"
        );
        cy.visit(URL.Root + URL.Artifacts);
        cy.wait("@waitForArtifactsList", { timeout: 300000 })
    }

    static waitForArtifactsList(){
        cy.intercept(ArtifactsPageLocators.artifactsList).as(
            "waitForArtifactsList"
        );
        cy.wait("@waitForArtifactsList", { timeout: 300000 })
    }

    uploadFile(fileName) {
        cy.get(ArtifactsPageLocators.modalWindow, { timeout: 30000 }).should('be.visible');
        cy.fixture(fileName, { encoding: null }).as("myFixture");
        cy.get(ArtifactsPageLocators.uploadFileInput).selectFile("@myFixture", { force: true });
    }

    checkArtifactsTableContains(text) {
        cy.contains("td", text).should("be.visible");
    }

    checkArtifactsTableIsNotContains(text) {
        cy.contains("td", text).should("not.exist");
    }

    deleteArtifact(name) {
        cy.contains("td", name)
            .siblings()
            .contains("div", "delete")
            .click({ force: true });
            cy.get(ArtifactsPageLocators.dialogContainer).contains(new RegExp("^OK$", "g")).click({ force: true });
    }

    selectFirstElementFromDropdown() {
        cy.get("mat-option").first().click({ force: true });
    }

}
