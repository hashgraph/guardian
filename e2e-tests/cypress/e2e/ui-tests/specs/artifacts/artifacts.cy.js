import {AuthenticationPage} from "../../pages/authentication";
import {ArtifactsPage} from "../../pages/artifacts";
import {PoliciesPage} from "../../pages/policies";

const home = new AuthenticationPage();
const artifacts = new ArtifactsPage();
const policies = new PoliciesPage();

describe("Artifacts", {tags: '@ui'}, () => {

    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        artifacts.openArtifactsTab();
        ArtifactsPage.waitForArtifactsList();
    })

    it("Verify if it possible to Import artifacts from file", () => {
        policies.clickOnButtonByText(" Import ");
        policies.clickOnButtonByText("Policy Identifier");
        policies.clickOnButtonByText("265testName");
        artifacts.uploadFile("artifactsImport.policy");
        artifacts.checkArtifactsTableContains("artifactsImport");
    });


    it("Verify if it possible to delete Imported artifact", () => {
        artifacts.deleteArtifact("265testName");
        artifacts.checkArtifactsTableIsNotContains("artifactsImport");
    });

});
