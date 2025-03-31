import * as Checks from "../../../support/checkingMethods";
import CommonElements from "../../../support/defaultUIElements";

const ArtifactsPageLocators = {
    artifactsImport: 'button[label="Import an Artifact"]',
    modalWindow: 'mat-dialog-container[id*="mat-dialog"]',
    uploadFileInput: '[dropzoneclassname="file-drop-zone"] input[type="file"]',
    artifactsList: "/api/v1/artifacts?pageIndex=0&pageSize=100&type=policy",
    dialogContainer: '.mat-dialog-container',
};

export class ArtifactsPage {

    openArtifactsTab() {
        cy.get(CommonElements.navBar).should('exist')
        cy.get("body").then(($body) => {
            if ($body.find(`span:contains(${CommonElements.artifactsTab})`).length == 0)
                cy.get(CommonElements.navBar).contains(CommonElements.mainPoliciesTab).click();
        })
        cy.get(CommonElements.navBar).contains(CommonElements.artifactsTab).click();
        Checks.waitForLoading();
    }

    uploadFile(fileName) {
        cy.get(ArtifactsPageLocators.artifactsImport).click();
        cy.get(CommonElements.dialogWindow).find(CommonElements.dropdown).click();
        cy.get(CommonElements.dropdownOption).first().click();
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
            .find("svg-icon[ng-reflect-src='/assets/images/icons/delete.sv']")
            .click({ force: true });
        cy.get(CommonElements.dialogWindow).contains(new RegExp("^Delete$", "g")).click({ force: true });
    }
}
