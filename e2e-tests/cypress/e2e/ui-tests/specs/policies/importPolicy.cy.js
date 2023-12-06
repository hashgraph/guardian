import {AuthenticationPage} from "../../pages/authentication";
import {PoliciesPage} from "../../pages/policies";

const home = new AuthenticationPage();
const policies = new PoliciesPage();

describe("Import Policy", {tags: '@ui'}, () => {

    const name = Math.floor(Math.random() * 999) + "testName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
    })

    it("Verify if it possible to Import published policy from file", () => {
        policies.clickOnButtonByText("Import");
        policies.clickOnButtonByTextInModal("Import from file");
        policies.uploadFile("policyImportPublished.policy");
        policies.openPoliciesTab();
        policies.checkPolicyTableContains("60testName");
    });

    it("Verify if it possible to Import published policy from IPFS", () => {
        policies.clickOnButtonByText("Import");
        policies.clickOnButtonByTextInModal("Import from IPFS");
        policies.fillImportIPFSForm("1695130119.675870328");
        policies.openPoliciesTab();
        policies.checkPolicyTableContains("406testName");
    });

    //its a bug
    // it("Verify if it possible to Import draft policy from file", () => {
    //     policies.clickOnButtonByText("Import");
    //     policies.clickOnButtonByTextInModal("Import from file");
    //     policies.uploadFile("policyImportDraft.policy");
    //     policies.openPoliciesTab();
    //     policies.checkPolicyTableContains("testDraft");
    // });
    //
    // it("Verify if it possible to Import dry run policy from file", () => {
    //     policies.clickOnButtonByText("Import");
    //     policies.clickOnButtonByTextInModal("Import from file");
    //     policies.uploadFile("policyDryRunImport.policy");
    //     policies.openPoliciesTab();
    //     policies.checkPolicyTableContains("testDryRunImport");
    // });
    //
    // it("Verify if it possible to Import dry run policy from IPFS", () => {
    //     policies.clickOnButtonByText("Import");
    //     policies.clickOnButtonByTextInModal("Import from IPFS");
    //     policies.fillImportIPFSForm("1695.222205299");
    //     policies.openPoliciesTab();
    //     policies.checkPolicyTableContains("policyDryRunImportIPFS");
    // });
});
