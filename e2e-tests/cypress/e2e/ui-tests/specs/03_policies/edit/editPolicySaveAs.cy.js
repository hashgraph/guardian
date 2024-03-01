import {AuthenticationPage} from "../../../pages/authentication";
import {PoliciesPage} from "../../../pages/policies";

const home = new AuthenticationPage();
const policies = new PoliciesPage();

describe("Edit Policy. Save As flow", {tags: '@ui'}, () => {

    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.createPolicyButton();
        policies.fillNewPolicyForm(name);
        policies.openPoliciesTab();
        policies.checkStatus(name, "Draft");
        policies.clickEditPolicy(name);
        policies.waitForEditPage();
        policies.clickOnButtonByText("Save As");
    });

    afterEach(() => {
        policies.openPoliciesTab();
        policies.deletePolicy(name);
        policies.checkPolicyTableNotContains(name);
    });

    it("Verify if a modal window appears after clicking on Save as", () => {
        policies.checkIfModalIsVisibleByText("New Policy");
        policies.checkButtonInModalIsNotActive("Ok");
    });

    it("Verify if a modal window have a validation", () => {
        policies.verifyIfFieldHasValidation("name");
        policies.verifyIfFieldHasValidation("policyTag");
    });

    it("Verify if save as can be successfully save a policy", () => {
        policies.fillFieldInModal("name", "testSaveAs");
        policies.fillFieldInModal("policyTag", "testTag");
        policies.clickOnButtonByText("Ok");
        cy.wait(500);
        policies.waitForLoadingProgress();
        policies.openPoliciesTab();
        policies.checkPolicyTableContains("testSaveAs");
    });
});
