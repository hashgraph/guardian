import { AuthenticationPage } from "../../pages/authentication";
import { PoliciesPage } from "../../pages/policies";
import { InstallerPage } from "../../pages/intaller-page";
import { RegistrantPage } from "../../pages/registrant-page";
import { TokensPage } from "../../pages/tokens";

const home = new AuthenticationPage();
const policies = new PoliciesPage();
const registrant = new RegistrantPage();
const installer = new InstallerPage();
const tokens = new TokensPage();

describe("Dry run  Policy",  { tags: '@ui' }, () => {
    const name = Math.floor(Math.random() * 999) + "testName";
    it("checks dry run workflow", () => {

        cy.viewport(1440, 900);

        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.createPolicyButton();
        policies.fillNewPolicyForm(name);
        policies.checkDraftStatus(name);
        policies.startDryRun(name);
        policies.stopDryRun(name);

    });
});

export {};
