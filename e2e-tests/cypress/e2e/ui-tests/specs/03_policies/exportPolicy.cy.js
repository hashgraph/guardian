import {AuthenticationPage} from "../../pages/authentication";
import {PoliciesPage} from "../../pages/policies";

const home = new AuthenticationPage();
const policies = new PoliciesPage();

describe("Export Policy", {tags: '@ui'}, () => {

    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.createPolicyButton();
        policies.fillNewPolicyForm(name);
        policies.openPoliciesTab();
    })

    it("Verify if it impossible to Export draft policy using message identifier", () => {
        policies.checkStatus(name, "Draft");
        policies.clickOnExportButton(name);
        policies.checkButtonInModalIsNotActive("Copy message identifier");
    });

    it("Verify if it possible to Export dry run policy using message identifier", () => {
        policies.startDryRun(name);
        policies.checkStatus(name, " In Dry Run ");
        policies.clickOnExportButton(name);
        policies.checkButtonInModalIsActive("Copy message identifier");
    });

    it("Verify if it possible to Export published policy using message identifier", () => {
        policies.publishDraftPolicy(name);
        policies.openPoliciesTab();
        PoliciesPage.waitForPolicyList();
        policies.checkStatus(name, " Published ");
        policies.clickOnExportButton(name);
        policies.checkButtonInModalIsActive("Copy message identifier");
    });

    it("Verify if it possible to Export draft policy using file", () => {
        policies.checkStatus(name, "Draft");
        policies.clickOnExportButton(name);
        policies.clickOnButtonByTextInModal("Save to file");
        cy.wait(1000);
        cy.checkIfFileExistByPartialName("policy");
    });

    it("Verify if it possible to Export dry run policy using file", () => {
        policies.startDryRun(name);
        policies.checkStatus(name, " In Dry Run ");
        policies.clickOnExportButton(name);
        policies.clickOnButtonByTextInModal("Save to file");
        cy.wait(1000);
        cy.checkIfFileExistByPartialName("policy");
    });

    it("Verify if it possible to Export published policy using file", () => {
        policies.publishDraftPolicy(name);
        policies.openPoliciesTab();
        policies.checkStatus(name, " Published ");
        policies.clickOnExportButton(name);
        policies.clickOnButtonByTextInModal("Save to file");
        cy.wait(1000);
        cy.checkIfFileExistByPartialName("policy");
    });

});
