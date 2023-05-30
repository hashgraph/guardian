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
    createBtn: 'div.g-dialog-actions-btn',
    addBtn: "*[class^='btn-approve btn-option ng-star-inserted']",
    createPolicyBtn: "Create New",
    inputName: "*[formcontrolname^='name']",
    draftBtn: 'ng-reflect-menu="[object Object]"',
    approveBtn: 'div.btn-approve',
    taskReq: '/api/v1/tasks/**',
    tagCreationModal: 'tags-create-dialog',
    createTagButton: ' Create Tag ',
    closeWindowButton: 'div.g-dialog-cancel-btn',
    tagsListRequest: "/api/v1/tags/",
    tagsDeleteRequest: "/api/v1/tags/*",
    tagDeleteButton: "div.delete-tag",
    tagNameInput: '[ng-reflect-name="name"]',
    tagDescInput: '[ng-reflect-name="description"]',
    createFinalBtn: "div.g-dialog-actions-btn",
    usersIconButton: 'div[mattooltip="Users"]',
    registrantLabel: 'Registrant ',
    tokenBalance: 'td.mat-column-tokenBalance',
    policyDeleteButton: "div.btn-icon-delete",
};

export class PoliciesPage {
    openPoliciesTab() {
        cy.visit(URL.Root + URL.Policies);
    }

    importPolicyButton() {
        cy.contains(PoliciesPageLocators.importBtn).click();
    }

    createPolicyButton() {
        cy.contains(PoliciesPageLocators.createPolicyBtn).click();
    }

    approveUser() {
        cy.contains("Go").first().click();
        cy.get(PoliciesPageLocators.approveBtn).click();
        cy.wait(20000);
    }
    approveDevice() {
        cy.contains("Go").first().click();
        cy.contains("Devices").click({ force: true });
        cy.contains("Approve").click({ force: true });
        cy.wait(20000);
    }
    approveRequest() {
        cy.contains("Go").first().click();
        cy.contains("Issue Requests").click({ force: true });
        cy.contains("Approve").click({ force: true });
        cy.wait(20000);
    }

    static waitForPolicyList(){
        cy.intercept(PoliciesPageLocators.policiesList).as(
            "waitForPoliciesList"
        );
        cy.wait("@waitForPoliciesList", { timeout: 300000 })
    }

    fillNewPolicyForm(name) {
        const inputName = cy.get(PoliciesPageLocators.inputName);
        inputName.type(name);
        cy.get(PoliciesPageLocators.createBtn).click();
        PoliciesPage.waitForPolicyList();
    }

    checkDraftStatus(name) {
        cy.contains("td", name)
            .siblings()
            .contains("div", "Draft")
            .should("be.visible");
    }

    startDryRun(name) {
        cy.contains("td", name)
            .siblings()
            .contains("div", "Draft")
            .click()
            .then(() => {
                cy.get('.cdk-overlay-pane').contains("div","Dry Run").click({ force: true });
            });
    }

    stopDryRun(name) {
        PoliciesPage.waitForPolicyList()
        cy.contains("td", name)
            .siblings()
            .contains("div", "In Dry Run")
            .click();
        cy.contains("Stop").click({ force: true });
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
        cy.intercept(PoliciesPageLocators.taskReq).as(
            "waitForPolicyImport"
        );
        cy.get(PoliciesPageLocators.submitBtn).click();
        cy.wait("@waitForPolicyImport", { timeout: 100000 })
        cy.get(PoliciesPageLocators.continueImportBtn).click();
    }

    publishPolicy() {
        cy.intercept(PoliciesPageLocators.policiesList).as(
            "waitForPoliciesList"
        );
        cy.wait("@waitForPoliciesList", {timeout: 300000})
        cy.get("tbody>tr").eq("0").find("td").eq("0").within((firstCell) => {
            cy.wrap(firstCell.text()).as("policyName").then(() => {
                cy.get("@policyName").then((policyName) => {
                    cy.contains(policyName).parent().find("td").eq("8").click();
                });
            });
        })
        cy.contains(PoliciesPageLocators.dropDawnPublishBtn).click({force: true})
        cy.get(PoliciesPageLocators.versionInput).type("0.0.1")
        cy.contains(PoliciesPageLocators.publishPolicyBtn, "Publish").click()
        cy.wait("@waitForPoliciesList", {timeout: 600000,})
        cy.get("@policyName").then((policyName) => {
            cy.contains(policyName).parent().find("td").eq("7")
            cy.contains(PoliciesPageLocators.publishedStatus);
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
        cy.contains("Go").first().click();
        cy.contains("Project Pipeline").click({ force: true });
        cy.wait(14000);
        cy.contains("Approve VVB").click({ force: true });
        cy.wait(8000);
        cy.contains("Project Pipeline").click({ force: true });
        cy.get(PoliciesPageLocators.addBtn).click();
        cy.wait(12000);
    }

    addTag(tagName) {
        cy.intercept(PoliciesPageLocators.tagsListRequest).as(
            "waitForTags"
        );
        cy.contains(PoliciesPageLocators.createTagButton).click();
        cy.get(PoliciesPageLocators.tagNameInput).type(tagName);
        cy.get(PoliciesPageLocators.tagDescInput).type(tagName);
        cy.get(PoliciesPageLocators.createFinalBtn).click();
        cy.wait("@waitForTags", { timeout: 30000 })
        cy.contains(tagName).should("exist");
    }

    deleteTag(tagName) {
        cy.intercept(PoliciesPageLocators.tagsDeleteRequest).as(
            "waitForTags"
        );
        cy.contains(tagName).click();
        cy.get(PoliciesPageLocators.tagDeleteButton).click();
        cy.wait("@waitForTags", { timeout: 30000 })
        cy.get(PoliciesPageLocators.closeWindowButton).click();
        cy.contains(tagName).should("not.exist");
    }

    checkTrustChain() {
        let tokenId;
        cy.readFile('cypress/fixtures/tokenId.txt').then(file => {
            tokenId = file;
        }).then(() => {
            cy.contains("Go").first().click();
            cy.contains("Token History").click({ force: true });
            cy.contains("View TrustChain").last().click({ force: true });
            cy.contains(tokenId.trim()).should("exist");
            cy.contains("123").should("exist");
        })
    }

    checkTokenHistory() {
        let tokenId;
        cy.readFile('cypress/fixtures/tokenId.txt').then(file => {
            tokenId = file;
        }).then(() => {
            cy.contains(tokenId.trim()).parent().parent().parent().find(PoliciesPageLocators.usersIconButton).click();
            cy.contains(PoliciesPageLocators.registrantLabel).parent().find(PoliciesPageLocators.tokenBalance).should('have.text', " 123 ");
        })
    }

    deletePolicy(policyName) {
        cy.contains(policyName).parent().find(PoliciesPageLocators.policyDeleteButton).click();
        cy.contains("OK").click();
        cy.contains(policyName).should("not.exist")
    }
}
