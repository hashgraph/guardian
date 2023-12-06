import {AuthenticationPage} from "../../pages/authentication";
import {PoliciesPage} from "../../pages/policies";

const home = new AuthenticationPage();
const policies = new PoliciesPage();

describe("Workflow Policy Deletion", {tags: '@ui'}, () => {

    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("Verify if it possible to delete draft policy", () => {
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.createPolicyButton();
        policies.fillNewPolicyForm(name);
        policies.openPoliciesTab();
        policies.checkStatus(name, "Draft");
        policies.deletePolicy(name);
        policies.checkPolicyTableNotContains(name);
    });

    it("Verify if it impossible to delete dry run policy", () => {
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.createPolicyButton();
        policies.fillNewPolicyForm(name);
        policies.openPoliciesTab();
        policies.checkStatus(name, "Draft");
        policies.startDryRun(name);
        policies.checkButtonIsNotActive(name, "delete");
    });
});
