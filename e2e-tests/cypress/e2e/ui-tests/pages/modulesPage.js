import * as Checks from "../../../support/checkingMethods";
import CommonElements from "../../../support/defaultUIElements";

const ModulesPageLocators = {
    createNewButton: "Create a Module",
    nameInput: '[formcontrolname="name"]',
    descriptionInput: '[formcontrolname="description"]',
    finalCreateButton: 'button[label="Create"]',
    importButton: "Import",
    importIPFSButton: " Import from IPFS ",
    timestampInput: '[formcontrolname="timestamp"]',
    moduleImportButton: 'button:contains("Import")',
    pImportButton: 'button[label="Import"]',
    moduleDeleteIcon: '[ng-reflect-src="/assets/images/icons/delete.sv"]',
    moduleDeleteButton: 'span:contains("Delete")',
    exportModule: '[ng-reflect-src="/assets/images/icons/export.sv"]',
    exportFileButton: " Save to file ",
    exportMessageIdButton: " Copy message identifier ",
    publishButton: "Publish ",
    publishedStatus: "Published",
    createButton: "[ng-reflect-label='Create']",
    deleteTagIcon: "svg-icon[svgclass='accent-color-red']",
    closeWindowButton: "[ng-reflect-label='Close']",
    headerSelector: 'tr.row-header th',
    moduleEditButton: '[ng-reflect-src="/assets/images/icons/edit.svg"]',
    moduleBlock: '[class="block-item"]',
    saveModuleEditing: "div.readonly-status[title='Save Module']",
    backButton: "div[title='Back']",
    componentsBlock: `span.drag-component-name`,
    blockItemName: (name) => `div.block-item-name:contains(${name})`,
    expandBlockBtn: (value) => `[block-instance="${value}"] .block-expand`,
    deleteBlockBtn: 'button[class*="delete-action"]:visible',




    okButton: "Ok",
    modulesList: "/api/v1/modules?pageIndex=0&pageSize=10",
    postPreviewIPFS: "/api/v1/modules/import/message/preview",
    postPreviewFile: "/api/v1/modules/import/file/preview",
    moduleRowSelector: 'tbody>tr[role="row"]',
    exportButton: '[mattooltip="Export"]',
    exportFileLabel: 'Save to file',
    exportIPFSLabel: 'Copy message identifier',
    createFinalBtn: "div.g-dialog-actions-btn",
    tagCreationModal: 'tags-create-dialog',
    createTagButton: ' Create a Tag ',
    tagNameInput: '[ng-reflect-name="name"]',
    tagDeleteButton: "div.delete-tag",
    tagDescInput: '[ng-reflect-name="description"]',
    tagsListRequest: "/api/v1/tags/",
    tagsDeleteRequest: "/api/v1/tags/*",
};

export class ModulesPage {

    openModulesTab() {
        cy.get(CommonElements.navBar).should('exist')
        cy.get("body").then(($body) => {
            if ($body.find(`span:contains(${CommonElements.modulesTab})`).length == 0)
                cy.get(CommonElements.navBar).contains(CommonElements.mainPoliciesTab).click();
        })
        cy.get(CommonElements.navBar).contains(CommonElements.modulesTab).click();
        Checks.waitForLoading();
    }

    createNewModule(moduleName) {
        cy.contains(ModulesPageLocators.createNewButton).click();
        cy.get(ModulesPageLocators.nameInput).type(moduleName);
        cy.get(ModulesPageLocators.descriptionInput).type(moduleName);
        cy.get(ModulesPageLocators.finalCreateButton).click();
        Checks.waitForLoading();
        cy.contains(moduleName).should("exist");
    }

    importNewModuleIPFS(messageId, name) {
        cy.contains(ModulesPageLocators.importButton).click();
        cy.contains(ModulesPageLocators.importIPFSButton).click();
        cy.get(ModulesPageLocators.timestampInput).type(messageId);
        cy.get(CommonElements.dialogWindow).find(ModulesPageLocators.moduleImportButton).click();
        Checks.waitForElement("div:contains('Details')")
        cy.get(ModulesPageLocators.moduleImportButton).last().click();
        Checks.waitForLoading();
        cy.contains(name).should("exist");
    }

    importNewModuleFile(fileName, name) {
        Checks.waitForLoading();
        cy.contains(ModulesPageLocators.importButton).click();
        cy.get(CommonElements.fileInput).selectFile('cypress/fixtures/' + fileName, { force: true });
        Checks.waitForElement("div:contains('Details')")
        cy.get(ModulesPageLocators.moduleImportButton).last().click();
        Checks.waitForLoading();
        cy.contains(name).should("exist");
    }

    deleteModule(moduleName) {
        Checks.waitForLoading();
        cy.contains(moduleName).siblings().find(ModulesPageLocators.moduleDeleteIcon).click();
        cy.get(ModulesPageLocators.moduleDeleteButton).click();
        Checks.waitForLoading();
        cy.contains(moduleName).should("not.exist")
    }

    checkStatus(name, status) {
        cy.contains("td", name).siblings().contains(status).should("exist");
    }

    openExportModal(name) {
        cy.contains("td", name).siblings().find(ModulesPageLocators.exportModule).click();
    }

    exportModuleAsFile(name) {
        this.openExportModal(name);
        Checks.waitForLoading();
        cy.get(CommonElements.dialogWindow).contains(ModulesPageLocators.exportFileButton).click();
        cy.verifyDownload('.module', { contains: true });
    }

    exportModuleAsMessageId(name) {
        this.openExportModal(name);
        Checks.waitForLoading();
        cy.get(CommonElements.dialogWindow).contains(ModulesPageLocators.exportMessageIdButton).realClick();
        cy.window().then((win) => {
            win.navigator.clipboard.readText().then((text) => {
                //regex numbers.numbers
                expect(text).to.match(/\d+\.\d+/g);
            });
        });
    }

    verifyThatButtonDisabled(buttonName) {
        cy.contains(buttonName).should('be.disabled');
    }

    publishModule(moduleName) {
        cy.contains(moduleName).parent().contains(ModulesPageLocators.publishButton).click();
        Checks.waitForLoading();
        cy.contains(moduleName).parent().contains(ModulesPageLocators.publishedStatus);
    }

    addTag(name, tagName) {
        cy.contains(name).siblings().contains(ModulesPageLocators.createTagButton).click();
        cy.get(ModulesPageLocators.tagNameInput).type(tagName);
        cy.get(ModulesPageLocators.tagDescInput).type(tagName);
        cy.get(ModulesPageLocators.createButton).click();
        cy.contains(tagName).should("exist");
    }

    deleteTag(name, tagName) {
        cy.contains(name).siblings().contains(tagName).click();
        cy.get(ModulesPageLocators.deleteTagIcon).click();
        cy.get(ModulesPageLocators.closeWindowButton).click();
        cy.contains(tagName).should("not.exist");
    }

    verifyButtonsAndHeaders() {
        cy.contains(ModulesPageLocators.createNewButton).should("exist");
        cy.contains(ModulesPageLocators.importButton).should("exist");
        cy.get(ModulesPageLocators.headerSelector).should(($header) => {
            expect($header.get(0).innerText).to.eq('NAME')
            expect($header.get(1).innerText).to.eq('DESCRIPTION')
            expect($header.get(2).innerText).to.eq('TAGS')
            expect($header.get(3).innerText).to.eq('STATUS')
            expect($header.get(4).innerText).to.eq('OPERATIONS')
        })
    }

    verifyDraftModuleDataAndActions(name) {
        cy.contains(new RegExp("^" + name + "$", "g")).parent().should(($module) => {
            const draftModuleChildren = $module.get(0).childNodes;
            expect(draftModuleChildren.item(0).innerText).to.eq(name);
            expect(draftModuleChildren.item(2).getElementsByTagName("button").item(0).innerText).to.eq("Create a Tag");
            expect(draftModuleChildren.item(3).firstChild.innerText).to.eq("Draft");
            expect(draftModuleChildren.item(4).getElementsByTagName("button").item(0).innerText).to.eq("Publish");
            expect(draftModuleChildren.item(4).getElementsByTagName("svg-icon").item(0).getAttribute('ng-reflect-src')).to.eq("/assets/images/icons/export.sv");
            expect(draftModuleChildren.item(4).getElementsByTagName("svg-icon").item(1).getAttribute('ng-reflect-src')).to.eq("/assets/images/icons/edit.svg");
            expect(draftModuleChildren.item(4).getElementsByTagName("svg-icon").item(2).getAttribute('ng-reflect-src')).to.eq("/assets/images/icons/delete.sv");
            expect(draftModuleChildren.item(4).getElementsByTagName("svg-icon").item(2).getAttribute('ng-reflect-svg-class')).to.eq("accent-color-red");
        })
    }

    verifyPublishedModuleDataAndActions(name) {
        cy.contains(name).parent().should(($module) => {
            const publishedModuleChildren = $module.get(0).childNodes;
            expect(publishedModuleChildren.item(0).innerText).to.eq(name);
            expect(publishedModuleChildren.item(2).getElementsByTagName("button").item(0).innerText).to.eq("Create a Tag");
            expect(publishedModuleChildren.item(3).getElementsByTagName("div").item(0).innerText).to.eq("Published");
            expect(publishedModuleChildren.item(4).getElementsByTagName("svg-icon").item(0).getAttribute('ng-reflect-src')).to.eq("/assets/images/icons/export.sv");
            expect(publishedModuleChildren.item(4).getElementsByTagName("svg-icon").item(1).getAttribute('ng-reflect-src')).to.eq("/assets/images/icons/edit.svg");
            expect(publishedModuleChildren.item(4).getElementsByTagName("svg-icon").item(2).getAttribute('ng-reflect-src')).to.eq("/assets/images/icons/delete.sv");
            expect(publishedModuleChildren.item(4).getElementsByTagName("svg-icon").item(2).getAttribute('ng-reflect-svg-class')).to.eq("disabled-color");
            expect(publishedModuleChildren.item(4).getElementsByTagName("button").item(0).getAttribute('disabled')).exist;
        })
    }

    openEditingModule(name) {
        cy.contains(name).parent().find(ModulesPageLocators.moduleEditButton).click();
        Checks.waitForElement(ModulesPageLocators.moduleBlock, undefined, 5000);
    }

    editModuleProperty(property, name) {
        cy.wait(500)
        if (property == "Description")
            cy.contains("td.cellName", new RegExp("^" + property + "$", "g")).parent().find(CommonElements.textarea).clear().type(name);
        else
            cy.contains("td.cellName", new RegExp("^" + property + "$", "g")).parent().find(CommonElements.Input).clear().type(name);
    }

    saveModuleEditing() {
        cy.get(ModulesPageLocators.saveModuleEditing).click();
    }

    backToModulesList() {
        cy.get(ModulesPageLocators.backButton).click();
    }

    verifyModuleProperty(name, property, value) {
        if (property == "Description")
            cy.contains("td", name).siblings(".cell-description").should('have.text', value + " ");
    }

    addNewBlock(name) {
        cy.contains(ModulesPageLocators.componentsBlock, name).click({ force: true });
    }

    checkBlockExists(name) {
        cy.get(ModulesPageLocators.blockItemName(name)).should("be.visible");
    }

    editBlockName(name, newName) {
        this.clickOnBlock(name);
        this.editModuleProperty("Tag", newName);
    }

    clickOnBlock(name) {
        cy.get(ModulesPageLocators.blockItemName(name)).should('be.visible').click({ force: true });
    }

    expandBlock(name) {
        cy.get(ModulesPageLocators.expandBlockBtn(name)).click({ force: true });
    }

    checkBlockNotExist(name) {
        cy.wait(10000)
        cy.get(ModulesPageLocators.blockItemName(name)).should("not.exist");
    }

    clickOnDeleteBlockButton() {
        cy.get(ModulesPageLocators.deleteBlockBtn).click({ force: true });
    }

    checkFieldsInEditModuleIsNotEditable() {
        cy.contains("td", new RegExp("^Name$", "g")).parent().find(CommonElements.Input).should('have.attr', 'readonly', 'readonly');
        cy.contains("td", new RegExp("^Topic Description$", "g")).parent().find(CommonElements.Input).should('have.attr', 'readonly', 'readonly');
        cy.contains("td", new RegExp("^Description$", "g")).parent().find(CommonElements.textarea).should('have.attr', 'readonly', 'readonly');
    }














    exportFile(moduleName) {
        cy.contains(moduleName).parent().find(ModulesPageLocators.exportButton).click();
        cy.contains(ModulesPageLocators.exportFileLabel).click();
    }

    exportIPFS(moduleName) {
        cy.contains(moduleName).parent().find(ModulesPageLocators.exportButton).click();
        cy.contains(ModulesPageLocators.exportIPFSLabel).click();
    }

    checkTheTextIsPresentInModule(text) {
        cy.contains(text).should("exist");
    }
}
