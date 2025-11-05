import * as Checks from "../../../support/checkingMethods";
import CommonElements from "../../../support/defaultUIElements";

const PoliciesPageLocators = {
    backButton: "div[title='Back']",
    savePolicyEditing: "div.readonly-status[title='Save Policy']",
    dynamicDialog: "p-dynamicdialog",
    deleteButton: "p-button[label='Delete']",
    actionsMore: "div.btn-icon-menu",
    editPolicy: "div.btn-icon-edit",
    createPolicyButton: 'p-button[ng-reflect-content="Create a Policy"]',
    importPolicyButton: 'p-button[ng-reflect-content="Import"]',
    inputName: "[formcontrolname='name']",
    policyBlock: '[class="block-item"]',
    policyDeleteButton: "Delete Policy",
    createButton: "Create",
    exportPolicy: "Export policy",
    exportFileButton: " Save to file ",
    BackToManagePolicies: "Back to Manage Policies",
    exportMessageIdButton: " Copy message identifier ",
    publishPolicyButton: 'Publish',
    discontinuePolicyButton: ' Discontinue ',
    discontinuePolicyOkButton: 'button[ng-reflect-label="OK"]',
    versionInput: 'input[id="version"]',
    importButton: 'button:contains("Import")',
    importIPFSOption: " Import from IPFS ",
    asNewPolicyRadioButton: "p-radiobutton[inputid='new-mode']",
    approveButton: 'div.btn-approve',
    revokeOption: "div.btn-option",
    deviceTab: "Devices",
    issueRequestsTab: "Issue Requests",
    approvedLabel: "span[title = 'Approved']",
    createTagButton: 'span:contains("Create a Tag")',
    inputName: 'input[formcontrolname="name"]',
    tagsExplorer: "tags-explorer",
    closeButton: 'span:contains("Close")',
    deleteTagIcon: "svg-icon[svgclass='accent-color-red']",
    projectPipelineTab: "Project Pipeline",
    waitingForValidation: "span[title = 'Waiting for Validation']",
    monitoringReports: "Monitoring Reports",
    minted: "span[title = 'Minted']",
    descriptionPolicy: "td.cell-description",
    componentsBlock: `span.drag-component-name`,
    blockItemName: (name) => `div.block-item-name:contains(${name})`,
    expandBlockBtn: (value) => `[block-instance="${value}"] .block-expand`,
    deleteBlockBtn: 'button[class*="delete-action"]:visible',
    componentsContainer: ".components-container:not(:hidden)",
    favoriteButton: ".component-btn-favorite",
    componentBtn: ".component-btn",
    moduleIcon: 'svg-icon[ng-reflect-src="/assets/images/icons/policy-mo"]',
    containerJson: ".textarea-code",
    treeContainer: ".tree-container",
    undo: "div[title='Undo']",
    redo: "div[title='Redo']",
    successValidationElement: "[title='Validation Policy']",
    errorCountElement: ".error-count",
    nextButton: "button[label='Next']",

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
    // loadingProgress: ".loading-progress",
    // policyEditView: "/api/v1/schemas/**",
    // moreButton: "div.btn-icon-more",
};

export class PoliciesPage {

    openPoliciesTab() {
        cy.get(CommonElements.navBar).should('exist')
        cy.get("body").then(($body) => {
            if ($body.find(`span:contains(${CommonElements.policiesTab})`).length == 0)
                cy.get(CommonElements.navBar).contains(CommonElements.mainPoliciesTab).should('exist').click();
        })
        cy.get(CommonElements.navBar).contains(CommonElements.policiesTab).should('exist').click();
        Checks.waitForLoading();
    }

    createPolicy() {
        Checks.waitForLoading();
        cy.get(PoliciesPageLocators.createPolicyButton).click();
    }

    fillNewPolicyForm(name) {
        cy.get(PoliciesPageLocators.inputName).type(name);
        cy.get(CommonElements.dialogWindow).contains(PoliciesPageLocators.createButton).click();
        Checks.waitForElement(PoliciesPageLocators.policyBlock, undefined, 5000);
    }

    backToPoliciesList() {
        Checks.waitForLoading();
        cy.get(PoliciesPageLocators.backButton).click({ force: true });
    }

    backToPoliciesListBtn() {
        Checks.waitForLoading();
        cy.contains(PoliciesPageLocators.BackToManagePolicies).click({ force: true });
    }

    checkStatus(name, status) {
        cy.contains("td", name).siblings().contains(status).should("exist");
    }

    deletePolicy(policyName) {
        cy.contains(policyName).parent().parent().find(PoliciesPageLocators.actionsMore).click();
        cy.contains(PoliciesPageLocators.policyDeleteButton).click();
        cy.get(PoliciesPageLocators.dynamicDialog).find(PoliciesPageLocators.deleteButton).click();
        Checks.waitForElement(PoliciesPageLocators.createPolicyButton);
        cy.contains(new RegExp("^" + policyName + "$", "g")).should("not.exist");
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
        cy.wait(500);
        cy.get(CommonElements.dialogWindow).contains(PoliciesPageLocators.exportFileButton).click();
        cy.verifyDownload('.policy', { contains: true });
    }

    exportPolicyAsMessageId(name) {
        this.openExportModal(name);
        cy.contains(PoliciesPageLocators.exportMessageIdButton).realClick();
        cy.window().then((win) => {
            win.navigator.clipboard.readText().then((text) => {
                //regex numbers.numbers
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

    discontinuePolicy(name) {
        cy.contains("td", name).siblings().eq(3).click();
        cy.contains("div.dropdown-item-title", PoliciesPageLocators.discontinuePolicyButton).click();
        cy.contains("span", 'Immediate').click();
        cy.get(PoliciesPageLocators.discontinuePolicyOkButton).click();
    }

    importPolicyFromFile(policyFileName) {
        cy.get(PoliciesPageLocators.importPolicyButton).click();
        cy.fixture(policyFileName, { encoding: null }).as("policyForImport");
        cy.get(CommonElements.dialogWindow).find(CommonElements.fileInput).selectFile("@policyForImport", { force: true });
        Checks.waitForElement(PoliciesPageLocators.asNewPolicyRadioButton);
        cy.get(CommonElements.dialogWindow).find(PoliciesPageLocators.importButton).last().click();
        Checks.waitForElement(PoliciesPageLocators.policyBlock, undefined, 5000);
    }

    importPolicyFromIPFS(messageId) {
        cy.get(PoliciesPageLocators.importPolicyButton).click();
        cy.contains(PoliciesPageLocators.importIPFSOption).should('be.visible').click();
        cy.get(CommonElements.dialogWindow).find(CommonElements.Input).type(messageId);
        cy.get(CommonElements.dialogWindow).find(PoliciesPageLocators.importButton).should("have.not.attr", "disabled");
        cy.get(CommonElements.dialogWindow).find(PoliciesPageLocators.importButton).click();
        Checks.waitForElement(PoliciesPageLocators.asNewPolicyRadioButton);
        cy.get(CommonElements.dialogWindow).last().find(PoliciesPageLocators.importButton).click();
        Checks.waitForElement(PoliciesPageLocators.policyBlock, undefined, 5000);
    }

    approve(waitFor) {
        cy.get(PoliciesPageLocators.approveButton).click();
        if (waitFor == "revoke")
            Checks.waitForElement(PoliciesPageLocators.revokeOption);
        if (waitFor == "approvedLabel")
            Checks.waitForElement(PoliciesPageLocators.approvedLabel);
        if (waitFor == "validationLabel")
            Checks.waitForElement(PoliciesPageLocators.waitingForValidation);
        if (waitFor == "minted")
            Checks.waitForElement(PoliciesPageLocators.minted);
    }

    openPolicy(name) {
        cy.contains("td", name).siblings().eq(0).click();
    }

    openEditingPolicy(name) {
        cy.contains(name).parent().parent().find(PoliciesPageLocators.editPolicy).click();
        Checks.waitForElement(PoliciesPageLocators.policyBlock, undefined, 5000);
    }

    approveUserInPolicy(waitFor = "revoke") {
        this.approve(waitFor);
    }

    openVVBTab() {
        Checks.waitForLoading();
        cy.get("p:contains('VVBs')").should('exist');
        cy.get('.preloader-image').should('not.exist');
        cy.get("p:contains('VVBs')").realClick();
    }

    openPPTab() {
        Checks.waitForLoading();
        cy.get("p:contains('Project Participants')").should('exist');
        cy.get('.preloader-image').should('not.exist');
        cy.get("p:contains('Project Participants')").click();
    }

    approveDeviceInPolicy(waitFor = "revoke") {
        Checks.waitForLoading();
        cy.contains(PoliciesPageLocators.deviceTab).should('exist');
        cy.get('.preloader-image').should('not.exist');
        cy.contains(PoliciesPageLocators.deviceTab).click();
        this.approve(waitFor);
    }

    approveIssueRequestInPolicy(waitFor = "revoke") {
        Checks.waitForLoading();
        cy.contains(PoliciesPageLocators.issueRequestsTab).should('exist');
        cy.get('.preloader-image').should('not.exist');
        cy.contains(PoliciesPageLocators.issueRequestsTab).click();
        this.approve(waitFor);
    }

    createTag(policyName, name) {
        cy.contains("td", policyName).siblings().find(PoliciesPageLocators.tagsExplorer).click();
        Checks.waitForLoading();
        cy.get('body').then((body) => {
            if (body.find(PoliciesPageLocators.createTagButton).length == 1)
                cy.get(PoliciesPageLocators.createTagButton).click();
        })
        cy.get(CommonElements.dialogWindow).last().find(PoliciesPageLocators.inputName).type(name);
        cy.get(CommonElements.dialogWindow).last().contains(PoliciesPageLocators.createButton).click();
        cy.get('body').then((body) => {
            if (body.find(PoliciesPageLocators.closeButton).length == 1)
                cy.get(PoliciesPageLocators.closeButton).click();
        })
        Checks.waitForLoading();
    }

    deleteTag(policyName, name) {
        cy.contains("td", policyName).siblings().find(PoliciesPageLocators.tagsExplorer).click();
        Checks.waitForLoading();
        cy.get(CommonElements.dialogWindow).contains(name).click();
        cy.get(PoliciesPageLocators.deleteTagIcon).click();
        cy.get(PoliciesPageLocators.closeButton).click();
        Checks.waitForLoading();
    }

    addProject() {
        cy.contains(PoliciesPageLocators.projectPipelineTab).click();
        this.approve("validationLabel");
    }

    approveReport() {
        Checks.waitForLoading();
        cy.get("p:contains('Monitoring reports')").click();
        Checks.waitForElement(PoliciesPageLocators.approveButton);
        this.approve("minted");
    }

    editPolicyProperty(property, name) {
        cy.wait(500)
        if (property == "Description")
            cy.contains("td.cellName", new RegExp("^" + property + "$", "g")).parent().find(CommonElements.textarea).clear().type(name);
        else
            cy.contains("td.cellName", new RegExp("^" + property + "$", "g")).parent().find(CommonElements.Input).clear().type(name);
    }

    savePolicyEditing() {
        cy.get(PoliciesPageLocators.savePolicyEditing).click();
    }

    verifyPolicyProperty(name, property, value) {
        if (property == "Description")
            cy.contains("td", name).siblings(".cell-description").should('have.text', value + " ");
    }

    checkFieldsInEditPolicyIsNotEditable() {
        cy.contains("td", new RegExp("^Name$", "g")).parent().find(CommonElements.Input).should('have.attr', 'readonly', 'readonly');
        cy.contains("td", new RegExp("^Policy Tag$", "g")).parent().find(CommonElements.Input).should('have.attr', 'readonly', 'readonly');
        cy.contains("td", new RegExp("^Topic Description$", "g")).parent().find(CommonElements.Input).should('have.attr', 'readonly', 'readonly');
        cy.contains("td", new RegExp("^Description$", "g")).parent().find(CommonElements.textarea).should('have.attr', 'readonly', 'readonly');
    }

    addNewBlock(name) {
        cy.contains(PoliciesPageLocators.componentsBlock, name).click({ force: true });
    }

    checkBlockExists(name) {
        cy.get(PoliciesPageLocators.blockItemName(name)).should("be.visible");
    }

    editBlockName(name, newName) {
        this.clickOnBlock(name);
        this.editPolicyProperty("Tag", newName);
    }

    clickOnBlock(name) {
        cy.get(PoliciesPageLocators.blockItemName(name)).should('be.visible').click({ force: true });
    }

    expandBlock(name) {
        cy.get(PoliciesPageLocators.expandBlockBtn(name)).click({ force: true });
    }

    checkBlockNotExist(name) {
        cy.wait(10000)
        cy.get(PoliciesPageLocators.blockItemName(name)).should("not.exist");
    }

    clickOnDeleteBlockButton() {
        cy.get(PoliciesPageLocators.deleteBlockBtn).click({ force: true });
    }

    selectToFavorites(name) {
        cy.get(PoliciesPageLocators.componentBtn).contains(name).next(PoliciesPageLocators.favoriteButton).click();
    }

    verifyIfSearchResultContains(text) {
        cy.wait(1000);
        cy.get(PoliciesPageLocators.componentsContainer).contains(text).should('exist');
    }

    verifyIfSearchResultIsNotContains(text) {
        cy.get(PoliciesPageLocators.componentsContainer).contains(text).should('not.exist');
    }

    fillSearchField(text) {
        cy.get('input[placeholder="Search"]:not(:hidden)').clear().type(text);
    }

    openModulesInPolicy() {
        cy.get(PoliciesPageLocators.moduleIcon).click();
    }

    verifyIfSearchResultIsEmpty() {
        cy.get(PoliciesPageLocators.componentsContainer).as("fieldName");
        cy.get("@fieldName").get(".components-group-body").as("fieldNameChild");
        cy.get("@fieldNameChild").should("be.empty");
    }

    clickOnButtonByText(text) {
        cy.contains(new RegExp("^" + text + "$", "g")).click({ force: true });
    }

    verifyIfTextExists(text) {
        cy.contains(text).should('exist');
    }

    verifyIfContainerJsonIsDisplayed() {
        cy.get(PoliciesPageLocators.containerJson).should('be.visible');
    }

    verifyIfTreeContainerIsDisplayed() {
        cy.get(PoliciesPageLocators.treeContainer).should('be.visible');
    }

    undo() {
        cy.get(PoliciesPageLocators.undo).should('have.attr', "storage-active", "true").click();
    }

    redo() {
        cy.get(PoliciesPageLocators.redo).should('have.attr', "storage-active", "true").click();
    }

    verifyIfValidationIsSuccessful() {
        cy.get(PoliciesPageLocators.successValidationElement).should('have.attr', 'errors-count', '0');
    }

    verifyIfValidationIsDisplayed() {
        cy.get(PoliciesPageLocators.errorCountElement).should('be.visible');
    }

    verifyIfValidationCountContains(count) {
        cy.get(PoliciesPageLocators.errorCountElement).should('have.text', count);
    }

    createDryRunUser() {
        cy.contains('Create User').click();
        Checks.waitForLoading();
    }

    openDryRunUser(user = "1") {
        if (user == "Administrator") {
            cy.contains('Users').realClick();
            cy.get(CommonElements.Loading).should('not.exist');
            cy.contains(user).click();
            Checks.waitForLoading();
        }
        else {
            cy.contains('Users').realClick();
            cy.get(CommonElements.Loading).should('not.exist');
            cy.contains(`Virtual User ${user}`).click();
            Checks.waitForLoading();
        }
    }

    registerAs(role) {
        cy.get(CommonElements.dropdown).first().click();
        cy.contains(role).click();
        cy.get(PoliciesPageLocators.nextButton).click();
        Checks.waitForLoading();
    }

    validateTypesDefault() {
        this.createDryRunUser();
        this.openDryRunUser();
        this.registerAs('RoleD');
        //number
        cy.get('input').eq(0).should('have.class', 'ng-valid');
        cy.get('input').eq(0).type('dsadsa');
        cy.get('input').eq(0).should('have.class', 'ng-invalid');
        cy.get('button:contains("Submit ")').should('be.disabled');
        cy.get('input').eq(0).clear({ force: true }).type('213', { force: true });
        cy.get('input').eq(0).should('have.class', 'ng-valid');
        //email
        cy.get('input').eq(1).should('have.class', 'ng-valid');
        cy.get('input').eq(1).type('dsadsa');
        cy.get('input').eq(1).should('have.class', 'ng-invalid');
        cy.get('button:contains("Submit ")').should('be.disabled');
        cy.get('input').eq(1).clear({ force: true }).type('dsadsa@dsadsa.dsadsa', { force: true });
        cy.get('input').eq(1).should('have.class', 'ng-valid');
        //image(IPFS)
        cy.get('input').eq(2).should('have.class', 'ng-valid');
        cy.get('input').eq(2).type('dsadsa');
        cy.get('input').eq(2).should('have.class', 'ng-invalid');
        cy.get('button:contains("Submit ")').should('be.disabled');
        cy.get('input').eq(2).clear({ force: true }).type('ipfs://dsadsa', { force: true });
        cy.get('input').eq(2).should('have.class', 'ng-valid');
        //date(date)
        cy.get('input').eq(3).type('fsdfds', { force: true });
        cy.get('input').eq(2).click();
        cy.get('input').eq(3).type('2025-01-03', { force: true });
        //geojson
        cy.get('button.guardian-button-secondary').eq(1).click();
        cy.get('textarea').eq(0).type('[1.321,2.321]', { force: true });
        cy.get('textarea').eq(0).should('have.class', 'ng-valid');

        cy.get('button:contains("Submit ")').should('be.enabled');
    }

    validateTypesRequired() {
        this.createDryRunUser();
        this.openDryRunUser("2");
        this.registerAs('RoleR');
        //number
        cy.get('input').eq(0).should('have.class', 'ng-invalid');
        cy.get('input').eq(0).type('dsadsa');
        cy.get('input').eq(0).should('have.class', 'ng-invalid');
        cy.get('button:contains("Submit ")').should('be.disabled');
        cy.get('input').eq(0).clear({ force: true }).type('213', { force: true });
        cy.get('input').eq(0).should('have.class', 'ng-valid');
        //date(date)
        cy.get('input').eq(1).type('fsdfds', { force: true });
        cy.get('input').eq(0).click();
        cy.get('input').eq(1).type('2025-01-03', { force: true });
        //email
        cy.get('input').eq(2).should('have.class', 'ng-invalid');
        cy.get('input').eq(2).type('dsadsa');
        cy.get('input').eq(2).should('have.class', 'ng-invalid');
        cy.get('button:contains("Submit ")').should('be.disabled');
        cy.get('input').eq(2).clear({ force: true }).type('dsadsa@dsadsa.dsadsa', { force: true });
        cy.get('input').eq(2).should('have.class', 'ng-valid');
        //image(IPFS)
        cy.get('input').eq(3).should('have.class', 'ng-invalid');
        cy.get('input').eq(3).type('dsadsa');
        cy.get('input').eq(3).should('have.class', 'ng-invalid');
        cy.get('button:contains("Submit ")').should('be.disabled');
        cy.get('input').eq(3).clear({ force: true }).type('ipfs://dsadsa', { force: true });
        cy.get('input').eq(3).should('have.class', 'ng-valid');
        //geojson
        cy.get('textarea').eq(0).type('[1.321,2.321]', { force: true });
        cy.get('textarea').eq(0).should('have.class', 'ng-valid');

        cy.get('button:contains("Submit ")').should('be.enabled');
    }

    validateTypesMultiplie() {
        this.createDryRunUser();
        this.openDryRunUser("3");
        this.registerAs('RoleMD');
        //number
        cy.get('button.guardian-button-secondary').eq(1).click();
        cy.get('input').eq(0).should('have.class', 'ng-valid');
        cy.get('input').eq(0).type('dsadsa');
        cy.get('input').eq(0).should('have.class', 'ng-invalid');
        cy.get('button:contains("Submit ")').should('be.disabled');
        cy.get('input').eq(0).clear({ force: true }).type('213', { force: true });
        cy.get('input').eq(0).should('have.class', 'ng-valid');
        //email
        cy.get('button.guardian-button-secondary').eq(2).click();
        cy.get('input').eq(1).should('have.class', 'ng-valid');
        cy.get('input').eq(1).type('dsadsa');
        cy.get('input').eq(1).should('have.class', 'ng-invalid');
        cy.get('button:contains("Submit ")').should('be.disabled');
        cy.get('input').eq(1).clear({ force: true }).type('dsadsa@dsadsa.dsadsa', { force: true });
        cy.get('input').eq(1).should('have.class', 'ng-valid');
        //image(IPFS)
        cy.get('button.guardian-button-secondary').eq(3).click();
        cy.get('input').eq(2).should('have.class', 'ng-valid');
        cy.get('input').eq(2).type('dsadsa');
        cy.get('input').eq(2).should('have.class', 'ng-invalid');
        cy.get('button:contains("Submit ")').should('be.disabled');
        cy.get('input').eq(2).clear({ force: true }).type('ipfs://dsadsa', { force: true });
        cy.get('input').eq(2).should('have.class', 'ng-valid');
        //date(date)
        cy.get('button.guardian-button-secondary').eq(4).click();
        cy.get('input').eq(3).type('fsdfds', { force: true });
        cy.get('input').eq(2).click();
        cy.get('input').eq(3).type('2025-01-03', { force: true });
        //geojson
        cy.get('button.guardian-button-secondary').eq(5).click();
        cy.get('textarea').eq(0).type('[1.321,2.321]', { force: true });
        cy.get('textarea').eq(0).should('have.class', 'ng-valid');

        cy.get('button:contains("Submit ")').should('be.enabled');
    }

    validateTypesMultiplieRequired() {
        this.createDryRunUser();
        this.openDryRunUser("4");
        this.registerAs('RoleMR');
        //number
        cy.get('input').eq(0).should('have.class', 'ng-invalid');
        cy.get('input').eq(0).type('dsadsa');
        cy.get('input').eq(0).should('have.class', 'ng-invalid');
        cy.get('button:contains("Submit ")').should('be.disabled');
        cy.get('input').eq(0).clear({ force: true }).type('213', { force: true });
        cy.get('input').eq(0).should('have.class', 'ng-valid');
        //email
        cy.get('input').eq(1).should('have.class', 'ng-invalid');
        cy.get('input').eq(1).type('dsadsa');
        cy.get('input').eq(1).should('have.class', 'ng-invalid');
        cy.get('button:contains("Submit ")').should('be.disabled');
        cy.get('input').eq(1).clear({ force: true }).type('dsadsa@dsadsa.dsadsa', { force: true });
        cy.get('input').eq(1).should('have.class', 'ng-valid');
        //date(date)
        cy.get('input').eq(2).type('fsdfds', { force: true });
        cy.get('input').eq(1).click();
        cy.get('input').eq(2).type('2025-01-03', { force: true });
        cy.get('input').eq(1).click();
        //image(IPFS)
        cy.get('input').eq(3).should('have.class', 'ng-invalid');
        cy.get('input').eq(3).type('dsadsa', { force: true });
        cy.get('input').eq(3).should('have.class', 'ng-invalid');
        cy.get('button:contains("Submit ")').should('be.disabled');
        cy.get('input').eq(3).clear({ force: true }).type('ipfs://dsadsa', { force: true });
        cy.get('input').eq(3).should('have.class', 'ng-valid');
        //geojson
        cy.get('textarea').eq(0).type('[1.321,2.321]', { force: true });
        cy.get('textarea').eq(0).should('have.class', 'ng-valid');

        cy.get('button:contains("Submit ")').should('be.enabled');
    }

    approveProject() {
        cy.contains("Projects").should('exist');
        cy.get('.preloader-image').should('not.exist');
        cy.contains("Projects").click();
        this.approve();
    }











    clickOnDivByText(text) {
        // cy.contains('div.tab-header', text).click({ force: true });
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

    approveOld() {
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

    addNewBlockByNameOld(name) {
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

    clickOnDeleteBlockButtonOld() {
        // cy.get(PoliciesPageLocators.deleteBlockBtn).first().click({ force: true });
    }

    expandBlockOld(name) {
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

    waitForEditPage() {
        // cy.get(PoliciesPageLocators.matTypography, { timeout: 60000 }).should('be.visible');
    }

    checkPolicyTagModalContains(text) {
        // cy.get(PoliciesPageLocators.dialogContainer).contains(text).should('exist');
    }
}
