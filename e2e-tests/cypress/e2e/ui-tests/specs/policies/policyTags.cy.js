import {AuthenticationPage} from "../../pages/authentication";
import {PoliciesPage} from "../../pages/policies";

const home = new AuthenticationPage();
const policies = new PoliciesPage();

describe("Workflow  Policy", {tags: '@ui'}, () => {
    const name = Math.floor(Math.random() * 999) + "testName";
    const tagName = Math.floor(Math.random() * 999) + "tagName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("create policy", () => {
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.createPolicyButton();
        policies.fillNewPolicyForm(name);
    });

    it("add policy tag", () => {
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.addTag(tagName);
    });

    it("delete policy tag", () => {
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.deleteTag(tagName);
    });
});
