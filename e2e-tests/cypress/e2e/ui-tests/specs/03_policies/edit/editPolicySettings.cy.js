import {AuthenticationPage} from "../../../pages/authentication";
import {PoliciesPage} from "../../../pages/policies";

const home = new AuthenticationPage();
const policies = new PoliciesPage();

describe("Edit Policy. Settings flow", {tags: '@ui'}, () => {

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

    it("Verify if it possible to swith to json mode", () => {
        policies.clickOnButtonByText("Settings");
        policies.verifyIfTextExists("Settings");
        policies.verifyIfTextExists("Cancel");
        policies.verifyIfTextExists("Save");
        policies.verifyIfTextExists("Theme");
        policies.verifyIfTextExists("New");
        policies.verifyIfTextExists("Copy");
        policies.verifyIfTextExists("Import");
        policies.verifyIfTextExists("Blocks");
        policies.verifyIfTextExists("Syntax");
        policies.verifyIfTextExists("Condition");
        policies.verifyIfTextExists("Style");
        policies.verifyIfTextExists("Description");
    });
});
