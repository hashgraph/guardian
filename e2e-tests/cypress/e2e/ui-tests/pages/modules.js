import URL from "../../../support/GuardianUrls";

const ModulesPageLocators = {
    createNewButton: "Create New",
    importButton: "Import",
    okButton: "Ok",
    finalImportButton: " Import ",
    importIPFSButton: "Import from IPFS",
    publishButton: " Publish ",
    nameInput: '[formcontrolname="name"]',
    timestampInput: '[formcontrolname="timestamp"]',
    descriptionInput: '[formcontrolname="description"]',
    finalCreateButton: "div.g-dialog-actions",
    modulesList: "/api/v1/modules?pageIndex=0&pageSize=100",
    publishedStatus: "Published",
    importFileButton: "Import from file",
    postPreviewIPFS: "/api/v1/modules/import/message/preview",
    postPreviewFile: "/api/v1/modules/import/file/preview",
    createNewButtonSelector: "button.add.mat-button-base",
    importButtonSelector: "button.add.mat-button-base",
    headerSelector: 'th[role="columnheader"]',
    moduleRowSelector: 'tbody>tr[role="row"]',
    exportButton: '[mattooltip="Export"]',
    exportFileLabel: 'Save to file',
    exportIPFSLabel: 'Copy message identifier',
    tagCreationModal: 'tags-create-dialog',
    createTagButton: ' Create Tag ',
    closeWindowButton: 'div.g-dialog-cancel-btn',
    createFinalBtn: "div.g-dialog-actions-btn",
    tagNameInput: '[ng-reflect-name="name"]',
    tagDescInput: '[ng-reflect-name="description"]',
};

export class ModulesPage {
    openModulesTab() {
        cy.visit(URL.Root + URL.Modules);
    }

    static waitForModulesListAfter(process){
        cy.intercept(ModulesPageLocators.modulesList).as(
            "waitForModulesListAfter" + process
        );
        cy.wait("@waitForModulesListAfter" + process, { timeout: 100000 })
    }

    static waitForPreviewAfter(process){
        cy.intercept(ModulesPageLocators.postPreview).as(
            "waitForPreviewAfter" + process
        );
        cy.wait("@waitForPreviewAfter" + process, { timeout: 40000 })
    }

    static attachModuleFile(fileName){
        cy.get('input[type=file]').selectFile('cypress/fixtures/' + fileName, {force: true});
    }


    createNewModule(moduleName) {
        cy.contains(ModulesPageLocators.createNewButton).click();
        cy.get(ModulesPageLocators.nameInput).type(moduleName);
        cy.get(ModulesPageLocators.descriptionInput).type(moduleName);
        cy.get(ModulesPageLocators.finalCreateButton).click();
        ModulesPage.waitForModulesListAfter("CreateModule");
        cy.contains(moduleName).should("exist");
    }

    importNewModuleIPFS(messageId){
        cy.contains(ModulesPageLocators.importButton).click();
        cy.contains(ModulesPageLocators.importIPFSButton).click();
        cy.get(ModulesPageLocators.timestampInput).type(messageId);
        cy.intercept(ModulesPageLocators.postPreviewIPFS).as(
            "waitForPreviewAfterIPFS"
        );
        cy.contains(ModulesPageLocators.okButton).click();
        cy.wait("@waitForPreviewAfterIPFS", { timeout: 40000 })
        cy.contains(ModulesPageLocators.finalImportButton).click();
        ModulesPage.waitForModulesListAfter("ImportIPFS");
        cy.contains("IPFSTestModule").should("exist");
    }

    publishModule(moduleName){
        cy.contains(moduleName).parent().contains(ModulesPageLocators.publishButton).click();
        ModulesPage.waitForModulesListAfter("PublishModule");
        cy.contains(moduleName).parent().contains(ModulesPageLocators.publishedStatus);
    }

    importNewModuleFile(fileName){
        cy.contains(ModulesPageLocators.importButton).click();
        cy.contains(ModulesPageLocators.importFileButton).click();
        cy.intercept(ModulesPageLocators.postPreviewFile).as(
            "waitForPreviewAfterFile"
        );
        ModulesPage.attachModuleFile(fileName);
        cy.wait("@waitForPreviewAfterFile", { timeout: 40000 })
        cy.wait(1000);
        cy.contains(ModulesPageLocators.finalImportButton).click();
        ModulesPage.waitForModulesListAfter("ImportFile");
        cy.contains("FTM").should("exist");
    }

    verifyButtonsAndHeaders() {
        cy.get(ModulesPageLocators.createNewButtonSelector).should("exist");
        cy.get(ModulesPageLocators.importButtonSelector).should("exist");
        cy.get(ModulesPageLocators.headerSelector).should(($header) => {
            expect($header.get(0).innerText).to.eq('Name')
            expect($header.get(1).innerText).to.eq('Description')
            expect($header.get(2).innerText).to.eq('Tags')
            expect($header.get(3).innerText).to.eq('Status')
            expect($header.get(4).innerText).to.eq('Operations')
            expect($header.get(5).innerText).to.eq('')
        })
    }

    verifyDraftModuleDataAndActions(moduleName) {
        cy.contains(ModulesPageLocators.createTagButton).click();
        cy.get(ModulesPageLocators.tagCreationModal).should('exist');
        cy.get(ModulesPageLocators.createFinalBtn).should('exist');
        cy.get(ModulesPageLocators.tagNameInput).should('exist');
        cy.get(ModulesPageLocators.tagDescInput).should('exist');
        cy.get(ModulesPageLocators.closeWindowButton).click();
        cy.get(ModulesPageLocators.moduleRowSelector).should(($module) => {
            const draftModuleChildren = $module.get(0).childNodes;
            expect(draftModuleChildren.item(0).innerText).to.eq(moduleName);
            expect(draftModuleChildren.item(1).innerText).to.eq(moduleName);
            expect(draftModuleChildren.item(2).getElementsByClassName("tag-name").item(0).innerText).to.eq("Create Tag");
            expect(draftModuleChildren.item(3).firstChild.getAttribute('ng-reflect-ng-switch')).to.eq("DRAFT");
            expect(draftModuleChildren.item(3).getElementsByClassName("module-status").item(0).innerText).to.eq("Draft");
            expect(draftModuleChildren.item(4).getElementsByClassName("btn-publish").item(0).innerText).to.eq("Publish");
            const draftModuleActions = draftModuleChildren.item(5).firstChild.children;
            expect(draftModuleActions.item(0).getAttribute('mattooltip')).to.eq("Export");
            expect(draftModuleActions.item(1).getAttribute('mattooltip')).to.eq("Edit");
            expect(draftModuleActions.item(2).getAttribute('mattooltip')).to.eq("Delete");
        })
    }

    verifyPublishedModuleDataAndActions(moduleName) {
        cy.get(ModulesPageLocators.moduleRowSelector).should(($module) => {
             const publishedModuleChildren = $module.get(1).childNodes;
            expect(publishedModuleChildren.item(0).innerText).to.eq(moduleName);
            expect(publishedModuleChildren.item(1).innerText).to.eq(moduleName);
            expect(publishedModuleChildren.item(2).getElementsByClassName("tag-name").item(0).innerText).to.eq("Create Tag");
            expect(publishedModuleChildren.item(3).firstChild.getAttribute('ng-reflect-ng-switch')).to.eq("PUBLISHED");
            expect(publishedModuleChildren.item(3).getElementsByClassName("module-status").item(0).innerText).to.eq("Published");
            expect(publishedModuleChildren.item(4).children.length).to.eq(0);
            const publishedModuleActions = publishedModuleChildren.item(5).firstChild.children;
            expect(publishedModuleActions.item(0).getAttribute('mattooltip')).to.eq("Export");
            expect(publishedModuleActions.item(1).getAttribute('mattooltip')).to.eq("Edit");
            expect(publishedModuleActions.item(2).className).to.eq("btn-icon-delete-des ng-star-inserted");
        })
    }

    exportFile(moduleName) {
        cy.contains(moduleName).parent().find(ModulesPageLocators.exportButton).click();
        cy.contains(ModulesPageLocators.exportFileLabel).click();
    }

    exportIPFS(moduleName) {
        cy.contains(moduleName).parent().find(ModulesPageLocators.exportButton).click();
        cy.contains(ModulesPageLocators.exportIPFSLabel).click();
    }
}
