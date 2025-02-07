import * as Checks from "../../../support/checkingMethods";
import CommonElements from "../../../support/defaultUIElements";

const PoliciesPageLocators = {
    backButton: "div[title='Back']",
    dynamicDialog: "p-dynamicdialog",
    deleteButton: "p-button[label='Delete']",
    actionsMore: "div.btn-icon-menu",
    createPolicyButton: 'p-button[ng-reflect-content="Create a Policy"]',
    importPolicyButton: 'p-button[ng-reflect-content="Import"]',
    inputName: "[formcontrolname='name']",
    policyBlock: '[class="block-item"]',
    policyDeleteButton: "Delete Policy",
    createButton: "Create",
    exportPolicy: "Export policy",
    exportFileButton: " Save to file ",
    exportMessageIdButton: " Copy message identifier ",
    publishPolicyButton: 'Publish',
    versionInput: 'input[id="version"]',
    importButton: 'button:contains("Import")',
    importIPFSOption: " Import from IPFS ",
    asNewPolicyRadioButton: "p-radiobutton[inputid='new-mode']",
    approveButton: 'div.btn-approve',
    revokeOption: "div.btn-option",
    deviceTab: "Devices",
    issueRequestsTab: "Issue Requests",

    // importBtn: '[label="Import"]',
    // importContinueBtn: 'p-button[label="Import"]',
    // importIcon: 'p-button[ng-reflect-text="Import"]',
    // importFileBtn: "Import from file",
    // importMsgBtn: "Import from IPFS",
    // msgInput: '[formcontrolname="timestamp"]',
    // importFile: '[type="file"]',
    // selectFileLink: "../../../../../Demo Artifacts/iREC/Policies/",
    // uploadBtn: ".g-dialog-actions-btn",
    // policiesList: "/api/v1/policies?pageIndex=0&pageSize=100",
    // continueImportBtn: 'p-button[label="Import"]',
    // publishBtn: "Publish",
    // publishPolicyBtn: 'button[label="Ok"]',
    // publishedStatus: "Published",
    // dropDawnPublishBtn: "li[role='option']",
    // submitBtn: 'button[type="submit"]',
    // createBtn: 'div.g-dialog-actions-btn',
    // addBtn: "*[class^='btn-approve btn-option ng-star-inserted']",
    // createPolicyBtn: 'p-button[ng-reflect-content="Create a Policy"]',
    // draftBtn: 'ng-reflect-menu="[object Object]"',
    // taskReq: '/api/v1/tasks/**',
    // disabledBtn: 'button.policy-menu-btn-des',
    // modalWindow: 'app-confirmation-dialog',
    // componentsBlock: '[class^="components-group-item"] span',
    // matTypography: '.mat-typography',
    // blockItem: '.block-item',
    // deleteBlockBtn: 'button[class*="delete-action"]',
    // expandBlockBtn: (value) => `[block-instance="${value}"] .block-expand`,
    // dialogContainer: '.mat-dialog-container',
    // deleteTagBtn: '.delete-tag',
    // closeModalBtn: '.g-dialog-cancel-btn',
    // uploadFileInput: 'input[type="file"]',
    // okModalBtn: '#ok-btn',
    // inputText: 'input[type="text"]',
    // tagCreationModal: 'tags-create-dialog',
    // createTagButton: ' Create Tag ',
    // closeWindowButton: 'div.g-dialog-cancel-btn',
    // tagsListRequest: "/api/v1/tags/",
    // tagsDeleteRequest: "/api/v1/tags/*",
    // tagDeleteButton: "div.delete-tag",
    // tagNameInput: '[ng-reflect-name="name"]',
    // tagDescInput: '[ng-reflect-name="description"]',
    // createFinalBtn: "div.g-dialog-actions-btn",
    // usersIconButton: 'div[mattooltip="Users"]',
    // registrantLabel: 'Registrant ',
    // tokenBalance: 'td.mat-column-tokenBalance',
    // policyDeleteButtonOld: "button.policy-menu-btn-del",
    // errorCountElement: ".error-count",
    // successValidationElement: "[title='Validation Policy']",
    // loadingProgress: ".loading-progress",
    // componentsContainer: ".components-container:not(:hidden)",
    // favoriteButton: ".component-btn-favorite",
    // componentBtn: ".component-btn",
    // containerJson: ".textarea-code",
    // treeContainer: ".tree-container",
    // policyEditView: "/api/v1/schemas/**",
    // moreButton: "div.btn-icon-more",
};

export class PoliciesPage {

    openPoliciesTab() {
        cy.get(CommonElements.navBar).should('exist')
        cy.get("body").then(($body) => {
            if ($body.find(`span:contains(${CommonElements.policiesTab})`).length==0)
                cy.get(CommonElements.navBar).contains(CommonElements.mainPoliciesTab).click();
        })
        cy.get(CommonElements.navBar).contains(CommonElements.policiesTab).click();
    }

    createPolicy() {
        cy.get(PoliciesPageLocators.createPolicyButton).click();
    }

    fillNewPolicyForm(name) {
        cy.get(PoliciesPageLocators.inputName).type(name);
        cy.get(CommonElements.dialogWindow).contains(PoliciesPageLocators.createButton).click();
        Checks.waitForElement(PoliciesPageLocators.policyBlock, undefined, 5000);
    }

    backToPoliciesList() {
        cy.get(PoliciesPageLocators.backButton).click();
    }

    checkStatus(name, status) {
        cy.contains("td", name).siblings().contains(status).should("exist");
    }

    deletePolicy(policyName) {
        cy.contains(policyName).parent().parent().find(PoliciesPageLocators.actionsMore).click();
        cy.contains(PoliciesPageLocators.policyDeleteButton).click();
        cy.get(PoliciesPageLocators.dynamicDialog).find(PoliciesPageLocators.deleteButton).click();
        Checks.waitForElement(PoliciesPageLocators.createPolicyButton);
        cy.contains(policyName).should("not.exist");
    }

    startDryRun(name) {
        cy.contains("td", name).siblings().contains("Draft").click();
        cy.contains("div.dropdown-item-title", "Dry Run").click();
        Checks.waitForLoading();
    }

    stopDryRun(name) {
        cy.contains("td", name).siblings().contains("div", "In Dry Run").click();
        cy.contains("div.dropdown-item-title", "Stop").click();
        Checks.waitForLoading();
    }

    exportPolicyAsFile(name) {
        this.openExportModal(name);
        cy.get(CommonElements.dialogWindow).contains(PoliciesPageLocators.exportFileButton).click();
        cy.verifyDownload('.policy', { contains: true });
    }

    exportPolicyAsMessageId(name) {
        this.openExportModal(name);
        cy.wait(500);
        cy.get(CommonElements.dialogWindow).contains(PoliciesPageLocators.exportMessageIdButton).focus().click();
        cy.window().then((win) => {
            win.navigator.clipboard.readText().then((text) => {
                expect(text).to.match(/\d+\.\d+/g);
            });
        });
    }

    openExportModal(name) {
        cy.contains(name).parent().parent().find(PoliciesPageLocators.actionsMore).click();
        cy.contains(PoliciesPageLocators.exportPolicy).click();
    }

    verifyThatButtonDisabled(buttonName) {
        cy.contains(buttonName).should('be.disabled');
    }

    verifyThatDeleteButtonIsNotActive(name) {
        cy.contains(name).parent().parent().find(PoliciesPageLocators.actionsMore).click();
        this.verifyThatButtonDisabled(PoliciesPageLocators.policyDeleteButton)
    }

    publishPolicy(name) {
        cy.contains("td", name).siblings().eq(3).click();
        cy.contains("div.dropdown-item-title", PoliciesPageLocators.publishPolicyButton).click();
        cy.get(PoliciesPageLocators.versionInput).type("0.8.4");
        cy.contains(CommonElements.Button, PoliciesPageLocators.publishPolicyButton).click();
        Checks.waitForElement(PoliciesPageLocators.policyBlock, undefined, 5000);
    }

    importPolicyFromFile(policyFileName) {
        cy.get(PoliciesPageLocators.importPolicyButton).click();
        cy.fixture(policyFileName, { encoding: null }).as("policyForImport");
        cy.get(CommonElements.dialogWindow).find(CommonElements.fileInput).selectFile("@policyForImport", { force: true });
        cy.get(CommonElements.dialogWindow).find(PoliciesPageLocators.importButton).click();
        Checks.waitForElement(PoliciesPageLocators.asNewPolicyRadioButton);
        cy.get(CommonElements.dialogWindow).find(PoliciesPageLocators.importButton).click();
        Checks.waitForElement(PoliciesPageLocators.policyBlock, undefined, 5000);
    }

    importPolicyFromIPFS(messageId) {
        cy.get(PoliciesPageLocators.importPolicyButton).click();
        cy.contains(PoliciesPageLocators.importIPFSOption).click();
        cy.get(CommonElements.dialogWindow).find(CommonElements.Input).type(messageId);
        cy.get(CommonElements.dialogWindow).find(PoliciesPageLocators.importButton).click();
        Checks.waitForElement(PoliciesPageLocators.asNewPolicyRadioButton);
        cy.get(CommonElements.dialogWindow).find(PoliciesPageLocators.importButton).click();
        Checks.waitForElement(PoliciesPageLocators.policyBlock, undefined, 5000);
    }

    approveUserInPolicy(name) {
        cy.contains("td", name).siblings().eq(0).click();
        cy.get(PoliciesPageLocators.approveButton).click();
        Checks.waitForElement(PoliciesPageLocators.revokeOption);
    }

    approveDeviceInPolicy(name) {
        cy.contains("td", name).siblings().eq(0).click();
        cy.contains(PoliciesPageLocators.deviceTab).click();
        cy.get(PoliciesPageLocators.approveButton).click();
        Checks.waitForElement(PoliciesPageLocators.revokeOption);
    }

    approveIssueRequestInPolicy(name) {
        cy.contains("td", name).siblings().eq(0).click();
        cy.contains(PoliciesPageLocators.issueRequestsTab).click();
        cy.get(PoliciesPageLocators.approveButton).click();
        Checks.waitForElement(PoliciesPageLocators.revokeOption);
    }







    checkButtonInModalIsNotActive(text) {
        //cy.get(PoliciesPageLocators.dialogContainer).contains(new RegExp("^" + text + "$", "g")).should('have.css', 'cursor', 'default');
    }

    clickOnExportButton(name) {
        // cy.contains(name).parent().parent().find(PoliciesPageLocators.actionsMore).click();
        // cy.contains(PoliciesPageLocators.exportPolicy).click();
    }

    clickOnButtonByTextInModal(text) {
        // cy.get(CommonElements.dialogWindow).contains(text).click({ force: true });
    }

    importPolicyButton() {
        // cy.get(PoliciesPageLocators.importIcon).click();
    }
    approveDevice() {
        // cy.contains("Register").first().click();
        // cy.contains("Devices").click({ force: true });
        // cy.contains("Approve").click({ force: true });
        // cy.wait(60000);
    }
    approveRequest() {
        // cy.contains("Register").first().click();
        // cy.contains("Issue Requests").click({ force: true });
        // cy.contains("Approve").click({ force: true });
        // cy.wait(180000);
    }

    static waitForPolicyList() {
        // cy.intercept(PoliciesPageLocators.policiesList).as(
        //     "waitForPoliciesList"
        // );
        // cy.wait("@waitForPoliciesList", { timeout: 300000 })
    }

    static waitForPolicyEdit() {
        // cy.intercept(PoliciesPageLocators.policyEditView).as(
        //     "waitForPolicyEdit"
        // );
        // cy.wait("@waitForPolicyEdit", { timeout: 300000 })
    }

    importPolicyFile(file) {
        // cy.contains(PoliciesPageLocators.importFileBtn).click();
        // cy.fixture(file, { encoding: null }).as("myFixture");
        // cy.get(PoliciesPageLocators.importFile).selectFile("@myFixture", {
        //     force: true,
        // });
        // cy.get(PoliciesPageLocators.continueImportBtn).click();
    }

    importPolicyMessage(msg) {
        // cy.contains(PoliciesPageLocators.importMsgBtn).click();
        // const inputMessage = cy.get(PoliciesPageLocators.msgInput);
        // inputMessage.type(msg);
        // cy.intercept(PoliciesPageLocators.taskReq).as(
        //     "waitForPolicyImport"
        // );
        // cy.get(PoliciesPageLocators.importBtn).click();
        // cy.wait(['@waitForPolicyImport', '@waitForPolicyImport'], { timeout: 100000 })
        // cy.get(PoliciesPageLocators.importContinueBtn).click();
        // PoliciesPage.waitForPolicyEdit();
    }

    checkButtonIsNotActive(name) {
        // cy.contains(name).parent().parent().find(PoliciesPageLocators.actionsMore).click();
        // cy.contains(PoliciesPageLocators.policyDeleteButton).should('be.disabled');
    }

    publishPolicyOld() {
        // cy.get("tbody>tr").eq("0").find("td").eq("0").within((firstCell) => {
        //     cy.wrap(firstCell.text()).as("policyName").then(() => {
        //         cy.get("@policyName").then((policyName) => {
        //             cy.wait(3000)
        //             cy.contains(policyName).parent().find("td").eq("7").click();
        //         });
        //     });
        // })
        // cy.get(PoliciesPageLocators.dropDawnPublishBtn).first().click()
        // cy.get(PoliciesPageLocators.versionInput).type("0.0.1")
        // cy.intercept(PoliciesPageLocators.policyEditView).as(
        //     "waitForPolicyEditView"
        // );
        // cy.get(PoliciesPageLocators.publishPolicyBtn).click()
        // cy.wait("@waitForPolicyEditView", { timeout: 300000 })
        // //cy.visit(URL.Root + URL.Policies);
        // cy.get("@policyName").then((policyName) => {
        //     cy.contains(policyName).parent().find("td").eq("7")
        //     cy.contains(PoliciesPageLocators.publishedStatus);
        // });
    }

    approve() {
        // cy.contains("Policies").click({ force: true });
        // cy.get("td").first().parent().get("td").eq("8").click();
        // cy.wait(12000);
        // cy.contains(" Approve ").click();
        // cy.wait(12000);
    }

    approveDevicebySR() {
        // cy.contains("Policies").click({ force: true });
        // cy.get("td").first().parent().get("td").eq("8").click();
        // cy.contains("Devices").click({ force: true });
        // cy.wait(8000);
        // cy.contains(" Approve ").click({ force: true });
    }

    addVVB() {
        // cy.contains("Go").first().click();
        // cy.contains("Project Pipeline").click({ force: true });
        // cy.wait(14000);
        // cy.contains("Approve VVB").click({ force: true });
        // cy.wait(8000);
        // cy.contains("Project Pipeline").click({ force: true });
        // cy.get(PoliciesPageLocators.addBtn).click();
        // cy.wait(12000);
    }

    clickEditPolicy(name) {
        // cy.contains("td", name)
        //     .siblings()
        //     .contains("div", "edit")
        //     .click();
        // cy.wait(1000);
    }

    fillFieldInEditPolicyPage(fieldName, text) {
        // cy.contains("td", new RegExp("^" + fieldName + "$", "g"))
        //     .siblings("td").as("fieldName");
        // if (fieldName == "Description") {
        //     cy.get("@fieldName").children("textarea").as("fieldNameChild");
        // } else {
        //     cy.get("@fieldName").children("input").as("fieldNameChild");
        // }
        // cy.get("@fieldNameChild").clear().type(text);
    }

    clickSaveButton() {
        // cy.contains("Save").click();
    }

    checkPolicyTableContains(text) {
        // cy.contains("td", text).should("be.visible");
    }

    checkFieldInEditPolicyIsNotEditable(fieldName) {
        // cy.contains("td", new RegExp("^" + fieldName + "$", "g"))
        //     .siblings("td").as("fieldName");
        // if (fieldName == "Description") {
        //     cy.get("@fieldName").children("textarea").as("fieldNameChild");
        // } else {
        //     cy.get("@fieldName").children("input").as("fieldNameChild");
        // }
        // cy.get("@fieldNameChild").should('have.attr', 'readonly', 'readonly');
    }

    publishDraftPolicy(name) {
        // cy.contains("td", name)
        //     .siblings()
        //     .contains("div", "Draft")
        //     .click();
        // cy.contains(new RegExp("^Publish$", "g")).click({ force: true });
        // cy.get(PoliciesPageLocators.versionInput).type("0.0.1")
        // cy.contains(PoliciesPageLocators.publishPolicyBtn, "Publish").click();
        // PoliciesPage.waitForPolicyEdit();
        // //PoliciesPage.waitForPolicyList();
    }

    checkModalWindowIsVisible(name) {
        // cy.get(PoliciesPageLocators.modalWindow).should("be.visible");
        // cy.contains(PoliciesPageLocators.modalWindow, name).should("be.visible");
    }

    checkPolicyTableFieldIsEmpty(fieldName) {
        // cy.contains("td", new RegExp("^" + fieldName + "$", "g")).siblings("td").as("fieldName");
        // if (fieldName == "Description") {
        //     cy.get("@fieldName").children("textarea").as("fieldNameChild");
        // } else {
        //     cy.get("@fieldName").children("input").as("fieldNameChild");
        // }
        // cy.get("@fieldNameChild").should("be.empty");
    }

    addNewBlockByName(name) {
        // cy.get(PoliciesPageLocators.componentsBlock).contains(name).click({ force: true });
    }

    checkBlockIsPresent(name) {
        // cy.get(PoliciesPageLocators.policyBlock).contains(name).should("be.visible");
    }

    checkBlockIsNotPresent() {
        // cy.get(PoliciesPageLocators.policyBlock).should("not.exist");
    }

    checkTrustChain() {
        // let tokenId;
        // cy.readFile('cypress/fixtures/tokenId.txt').then(file => {
        //     tokenId = file;
        // }).then(() => {
        //     cy.contains("Go").first().click();
        //     cy.contains("Token History").click({ force: true });
        //     cy.contains("View TrustChain").last().click({ force: true });
        //     cy.contains(tokenId.trim()).should("exist");
        //     cy.contains("123").should("exist");
        // })
    }

    checkTokenHistory() {
        // let tokenId;
        // cy.readFile('cypress/fixtures/tokenId.txt').then(file => {
        //     tokenId = file;
        // }).then(() => {
        //     cy.contains(tokenId.trim()).parent().parent().parent().find(PoliciesPageLocators.usersIconButton).click();
        //     cy.contains(PoliciesPageLocators.registrantLabel).parent().find(PoliciesPageLocators.tokenBalance).should('have.text', " 123 ");
        // })
    }

    clickOnAddedBlock(name) {
        // cy.get(PoliciesPageLocators.blockItem).contains(name).click({ force: true });
    }

    clickOnDeleteBlockButton() {
        // cy.get(PoliciesPageLocators.deleteBlockBtn).first().click({ force: true });
    }

    expandBlock(name) {
        // cy.get(PoliciesPageLocators.expandBlockBtn(name)).click({ force: true });
    }

    clickOnButtonOnPolicy(name, text) {
        // cy.contains("td", name)
        //     .siblings()
        //     .contains("div", text)
        //     .click({ force: true });
    }

    fillNewTagForm(name) {
        // const inputName = cy.get(PoliciesPageLocators.inputName);
        // inputName.type(name);
        // cy.get(PoliciesPageLocators.createBtn).click();
    }

    clickOnButtonByText(text) {
        // cy.contains(new RegExp("^" + text + "$", "g")).click({ force: true });
    }

    clickOnDivByText(text) {
        // cy.contains('div.tab-header', text).click({ force: true });
    }

    clickOnDeleteTag() {
        // cy.get(PoliciesPageLocators.deleteTagBtn).click({ force: true });
    }

    clickOnCloseModal() {
        // cy.get(PoliciesPageLocators.closeModalBtn).click({ force: true });
    }

    uploadFile(fileName) {
        // cy.fixture(fileName, { encoding: null }).as("myFixture");
        // cy.get(PoliciesPageLocators.uploadFileInput).selectFile("@myFixture", { force: true });
        // cy.intercept(PoliciesPageLocators.policyEditView).as(
        //     "waitForPolicyEditView"
        // );
        // cy.get(PoliciesPageLocators.continueImportBtn).click({ force: true });
        // cy.wait("@waitForPolicyEditView", { timeout: 300000 })
    }

    fillImportIPFSForm(text) {
        // cy.get(PoliciesPageLocators.inputText).type(text);
        // cy.get(PoliciesPageLocators.okModalBtn).click({ force: true });
        // cy.intercept(PoliciesPageLocators.policyEditView).as(
        //     "waitForPolicyEditView"
        // );
        // cy.get(PoliciesPageLocators.continueImportBtn).click({ force: true });
        // cy.wait("@waitForPolicyEditView", { timeout: 300000 })
    }

    fillImportIPFSFromClipboard() {
        // cy.get(PoliciesPageLocators.inputText).then($input => {
        //     cy.window().then(win => {
        //         win.navigator.clipboard.readText().then(text => {
        //             $input.val(text);
        //         });
        //     });
        // });
    }

    checkButtonInModalIsActive(text) {
        // cy.get(PoliciesPageLocators.dialogContainer).contains(new RegExp("^" + text + "$", "g")).should('have.css', 'cursor', 'pointer');
    }

    checkIfModalIsVisibleByText(text) {
        // cy.get(PoliciesPageLocators.dialogContainer).contains(new RegExp("^" + text + "$", "g"))
    }

    verifyIfValidationIsDisplayed() {
        // cy.get(PoliciesPageLocators.errorCountElement).should('be.visible');
    }

    verifyIfValidationCountContains(count) {
        // cy.get(PoliciesPageLocators.errorCountElement).should('have.text', count);
    }

    verifyIfValidationIsSuccessful() {
        // cy.get(PoliciesPageLocators.successValidationElement).should('have.attr', 'errors-count', '0');
    }

    verifyIfFieldHasValidation(field) {
        // cy.get(`input[formcontrolname='${field}']`)
        //     .clear()
        //     .trigger('blur');
        // cy.get(`input[formcontrolname='${field}']`).should("have.class", "ng-invalid");
    }

    fillFieldInModal(field, text) {
        // cy.get(`input[formcontrolname='${field}']`).clear().type(text);
    }

    waitForLoadingProgress() {
        // cy.get(PoliciesPageLocators.loadingProgress, { timeout: 180000 }).should('not.exist');
    }

    fillSearchField(text) {
        // cy.get('input[placeholder="Search"]:not(:hidden)').clear().type(text);
    }

    verifyIfSearchResultContains(text) {
        // cy.get(PoliciesPageLocators.componentsContainer).contains(text).should('exist');
    }

    verifyIfSearchResultIsEmpty() {
        // cy.get(PoliciesPageLocators.componentsContainer).as("fieldName");
        // cy.get("@fieldName").get(".components-group-body").as("fieldNameChild");
        // cy.get("@fieldNameChild").should("be.empty");
    }

    selectToFavorites(name) {
        // cy.get(PoliciesPageLocators.componentBtn).contains(name).next(PoliciesPageLocators.favoriteButton).click();
    }

    verifyIfSearchResultIsNotContains(text) {
        // cy.get(PoliciesPageLocators.componentsContainer).contains(text).should('not.exist');
    }

    verifyIfContainerJsonIsDisplayed() {
        // cy.get(PoliciesPageLocators.containerJson).should('be.visible');
    }

    verifyIfTreeContainerIsDisplayed() {
        // cy.get(PoliciesPageLocators.treeContainer).should('be.visible');
    }

    verifyIfTextExists(text) {
        // cy.contains(text).should('exist');
    }

    waitForEditPage() {
        // cy.get(PoliciesPageLocators.matTypography, { timeout: 60000 }).should('be.visible');
    }

    checkPolicyTagModalContains(text) {
        // cy.get(PoliciesPageLocators.dialogContainer).contains(text).should('exist');
    }
}
