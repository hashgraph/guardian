import { HomePage } from "../../pages/homepage";
import { PoliciesPage } from "../../pages/policies";
import { InstallerPage } from "../../pages/intaller-page";
import API from "../../../../support/ApiUrls";

const home = new HomePage();
const policies = new PoliciesPage();
const installer = new InstallerPage();

describe("Import and publish irec policy", () => {
  const authorization = Cypress.env("authorization");

    before("Loads the home page", () => {
        const urlPolicies = {
            method: "GET",
            url: API.ApiServer + "policies",
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).should((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;

            const url = {
                method: "GET",
                url:
                    Cypress.env("api_server") +
                    "policies/" +
                    policyId +
                    "/export/file",
                encoding: null,
                headers: {
                    authorization,
                },
            };
            cy.request(url).then((response) => {
                let policy = Cypress.Blob.arrayBufferToBinaryString(
                    response.body
                );
                cy.writeFile(
                    "cypress/fixtures/ui.policy",
                    policy,
                    "binary"
                );
            });
        });

        cy.viewport(1230, 800);
        home.visit();
    });

    it("checks Irec policy 1 workflow", () => {
        home.loginAsStandartRegistry();
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyFile("ui.policy");
        policies.publishPolicy();
        home.logoutAsStandartRegistry();
    });
});

export {};
