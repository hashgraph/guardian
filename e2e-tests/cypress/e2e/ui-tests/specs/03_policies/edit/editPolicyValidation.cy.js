import {AuthenticationPage} from "../../../pages/authentication";
import {PoliciesPage} from "../../../pages/policies";

const home = new AuthenticationPage();
const policies = new PoliciesPage();

describe("Edit Policy. Validation flow", {tags: '@ui'}, () => {

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
    });

    afterEach(() => {
        policies.openPoliciesTab();
        policies.deletePolicy(name);
        policies.checkPolicyTableNotContains(name);
    });

    it("Checking for successful validation", () => {
        policies.clickOnButtonByText("Validation");
        policies.verifyIfValidationIsSuccessful();
    });

    it("Verify that the validation is displayed successfully", () => {
        policies.addNewBlockByName("Action");
        policies.clickOnButtonByText("Validation");
        policies.verifyIfValidationIsDisplayed();
    });

    it("Verify that the validation count is working successfully", () => {
        policies.addNewBlockByName("Action");
        policies.addNewBlockByName("Button");
        policies.clickOnButtonByText("Validation");
        policies.verifyIfValidationCountContains(2);
    });
});
