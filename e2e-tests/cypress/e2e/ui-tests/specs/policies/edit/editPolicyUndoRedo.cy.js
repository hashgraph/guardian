import {AuthenticationPage} from "../../../pages/authentication";
import {PoliciesPage} from "../../../pages/policies";

const home = new AuthenticationPage();
const policies = new PoliciesPage();

describe("Edit Policy. Udo/Redo flow", {tags: '@ui'}, () => {

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

    it("Verify if it possible to cancel action by Undo", () => {
        policies.addNewBlockByName("Create Token");
        policies.clickOnButtonByText("Undo");
        policies.checkBlockIsNotPresent();
    });

    it("Verify if it possible to move forward by Redo", () => {
        policies.addNewBlockByName("Create Token");
        policies.clickOnButtonByText("Redo");
        policies.checkBlockIsPresent("Block_1");
    });
});
