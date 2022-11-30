import ASSERT from "../../../support/CustomHelpers/assertions";
import TIMEOUTS from "../../../support/CustomHelpers/timeouts";
import URL from "../../../support/GuardianUrls";

const PoliciesPageLocators = {
    importBtn: "Import",
    importFileBtn: "Import from file",
    importMsgBtn: "Import from IPFS",
    msgInput: '[data-placeholder="Message timestamp"]',
    importFile: '[type="file"]',
    selectFileLink: "../../../../../Demo Artifacts/iREC/Policies/",
    uploadBtn: ".g-dialog-actions-btn",
    policiesList: "/api/v1/policies?pageIndex=0&pageSize=100",
    continueImportBtn: "*[class^='g-dialog-actions-btn']",
    publishBtn: "Publish",
    versionInput: '[data-placeholder="1.0.0"]',
    publishPolicyBtn: ".mat-button-wrapper",
    publishedStatus: "Published",
    dropDawnPublishBtn: "Release version into public domain.",
    submitBtn: 'button[type="submit"]',
    addBtn:  "*[class^='btn-approve btn-option ng-star-inserted']",
};

export class PoliciesPage {
    openPoliciesTab() {
        cy.visit(URL.Root + URL.Policies);
    }

    importPolicyButton() {
        cy.contains(PoliciesPageLocators.importBtn).click();
    }

    importPolicyFile(file) {
        cy.contains(PoliciesPageLocators.importFileBtn).click();
        cy.fixture(file, { encoding: null }).as("myFixture");
        cy.get(PoliciesPageLocators.importFile).selectFile("@myFixture", {
            force: true,
        });
        cy.get(PoliciesPageLocators.continueImportBtn).click();
    }

    importPolicyMessage(msg) {
        cy.contains(PoliciesPageLocators.importMsgBtn).click();
        const inputMessage = cy.get(PoliciesPageLocators.msgInput);
        inputMessage.type(msg);
        cy.get(PoliciesPageLocators.submitBtn).click();
        cy.get(PoliciesPageLocators.continueImportBtn).click();
    }

    publishPolicy() {
        cy.intercept(PoliciesPageLocators.policiesList).as(
            "waitForPoliciesList"
        );
        cy.wait("@waitForPoliciesList", { timeout: 200000 }).then(() => {
            //get policy name
            cy.get("tbody>tr")
                .eq("0")
                .find("td")
                .eq("0")
                .within((firstCell) => {
                    //publish uploaded policy
                    cy.wrap(firstCell.text())
                        .as("policyName")
                        .then(() => {
                            cy.get("@policyName").then((policyName) => {
                                cy.contains(policyName)
                                    .parent()
                                    .find("td")
                                    .eq("7")
                                    .click();
                            });
                        });
                })
                .then(() => {
                    cy.wait(5000);
                    cy.contains(PoliciesPageLocators.dropDawnPublishBtn)
                        .click({ force: true })
                        .then(() => {
                            cy.get(PoliciesPageLocators.versionInput)
                                .type("0.0.1")
                                .then(() => {
                                    cy.contains(
                                        PoliciesPageLocators.publishPolicyBtn,
                                        "Publish"
                                    )
                                        .click()
                                        .then(() => {
                                            //wait until policy published
                                            cy.wait("@waitForPoliciesList", {
                                                timeout: 600000,
                                            }).then(() => {
                                                cy.get("@policyName").then(
                                                    (policyName) => {
                                                        cy.contains(policyName)
                                                            .parent()
                                                            .find("td")
                                                            .eq("7")
                                                            .then(() => {
                                                                cy.contains(
                                                                    PoliciesPageLocators.publishedStatus
                                                                );
                                                            });
                                                    }
                                                );
                                            });
                                        });
                                });
                        });
                });
        });
    }

    approve() {
        cy.contains("Policies").click({ force: true });
        cy.get("td").first().parent().get("td").eq("8").click();
        cy.wait(12000);
        cy.contains(" Approve ").click();
        cy.wait(12000);
    }

    approveDevicebySR() {
        cy.contains("Policies").click({ force: true });
        cy.get("td").first().parent().get("td").eq("8").click();
        cy.contains("Devices").click({ force: true });
        cy.wait(8000);
        cy.contains(" Approve ").click({ force: true });
    }


    addVVB() {
      cy.contains("Policies").click({ force: true });
      cy.get("td").first().parent().get("td").eq("8").click();
      cy.contains("Project Pipeline").click({ force: true });
      cy.wait(14000);
      cy.contains("Approve VVB").click({ force: true });
      cy.wait(8000);
      cy.contains("Project Pipeline").click({ force: true });
      cy.get(PoliciesPageLocators.addBtn).click();
      cy.wait(12000);
    }
}
