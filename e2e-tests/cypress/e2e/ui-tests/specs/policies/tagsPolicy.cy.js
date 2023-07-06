import {AuthenticationPage} from "../../pages/authentication";
import {PoliciesPage} from "../../pages/policies";

const home = new AuthenticationPage();
const policies = new PoliciesPage();

describe("Tags Policy", {tags: '@ui'}, () => {

    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.createPolicyButton();
        policies.fillNewPolicyForm(name);
    })

    it("Verify if it possible to add tags", () => {
        policies.checkStatus(name, "Draft");
        policies.clickOnButtonOnPolicy(name, " Create Tag ");
        policies.fillNewTagForm(name + "tag");
        policies.checkPolicyTableContains(name + "tag");
        policies.clickOnButtonOnPolicy(name, name + "tag");
        policies.clickOnButtonByTextInModal(" Create Tag ");
        policies.fillNewTagForm(name + "tag2");
        policies.checkPolicyTagModalContains(name + "tag2");
    });

    it("Verify if it possible to delete tags", () => {
        policies.checkStatus(name, "Draft");
        policies.clickOnButtonOnPolicy(name, " Create Tag ");
        policies.fillNewTagForm(name + "tag");
        policies.checkPolicyTableContains(name + "tag");
        policies.clickOnButtonOnPolicy(name, name + "tag");
        policies.clickOnButtonByTextInModal(" Create Tag ");
        policies.fillNewTagForm(name + "tag2");
        policies.checkPolicyTagModalContains(name + "tag2");
        policies.clickOnButtonByTextInModal(name + "tag");
        policies.clickOnDeleteTag();
        policies.clickOnCloseModal();
        policies.checkPolicyTableNotContains(name + "tag");
    });
});