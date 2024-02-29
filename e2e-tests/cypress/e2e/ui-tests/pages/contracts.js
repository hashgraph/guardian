import ASSERT from "../../../support/CustomHelpers/assertions";
import URL from "../../../support/GuardianUrls";

const ContractsPageLocators = {
    createContractBtn: "Create Contract",
    importContractBtn: "Import Contract",
    operationsBtn: " Operations ",
    viewBtn: "View",
    addPairBtn: "Add Pair",
    addUserBtn: "Add User",
    contractNameDescriptionInput: '[data-placeholder = "Description"]',
    okBtn: "Ok",
    cancelBtn: "Cancel",
    contractIdInput: '[data-placeholder = "Description"]',
    contractList: "/api/v1/contracts?pageIndex=0&pageSize=100",
    contractName: "td.mat-column-description",
    basicTokenSelect: '[formcontrolname="baseTokenId"]',
    oppositeTokenSelect: '[formcontrolname="oppositeTokenId"]',
    tokenPairingStart: "/api/v1/contracts/pair?*",
    createFinalBtn: "div.g-dialog-actions-btn",
    basicTokenCount: '[formcontrolname="baseTokenCount"]',
    oppositeTokenCount: '[formcontrolname="oppositeTokenCount"]',
    userIdInput: '[data-placeholder="User Identifier"]',
    importedContractIdInput: '[ng-reflect-name="contractId"]',
    tagNameInput: '[ng-reflect-name="name"]',
    tagDescInput: '[ng-reflect-name="description"]',
    importedContractDescInput: '[ng-reflect-name="description"]',
    headerSelector: 'th[role="columnheader"]',
    contractRowSelector: 'tbody>tr[role="row"]',
    tagCreationModal: 'tags-create-dialog',
    createTagButton: ' Create Tag ',
    closeWindowButton: 'div.g-dialog-cancel-btn',
    tagsListRequest: "/api/v1/tags/",
    tagsDeleteRequest: "/api/v1/tags/*",
    tagDeleteButton: "div.delete-tag",
};

export class ContractsPage {
    openContractsTab() {
        cy.visit(URL.Root + URL.Contracts);
    }

    static waitForContracts()
    {
        cy.intercept(ContractsPageLocators.contractList).as(
            "waitForContractList"
        );
        cy.wait("@waitForContractList", { timeout: 200000 })
    }

    createContract(name)
    {
        cy.contains(ContractsPageLocators.createContractBtn).click();
        cy.get(ContractsPageLocators.contractNameDescriptionInput).type(name);
        cy.contains(ContractsPageLocators.okBtn).click();
        ContractsPage.waitForContracts();
        cy.contains(ContractsPageLocators.contractName, name).should(ASSERT.exist);
    }

    addPairToContract(name, basicTokenName, oppositeTokenName) {
        cy.intercept(ContractsPageLocators.tokenPairingStart).as(
            "waitForPairing"
        );
        cy.contains(ContractsPageLocators.contractName, name).parent().
            contains(ContractsPageLocators.operationsBtn).click()
        cy.contains(ContractsPageLocators.addPairBtn).click({force: true});
        cy.get(ContractsPageLocators.basicTokenSelect).click();
        cy.contains(basicTokenName).click();
        cy.wait("@waitForPairing", { timeout: 200000 })
        cy.get(ContractsPageLocators.oppositeTokenSelect).click();
        cy.contains(oppositeTokenName).click();
        cy.wait("@waitForPairing", { timeout: 200000 });
        cy.get(ContractsPageLocators.basicTokenCount).type("1");
        cy.get(ContractsPageLocators.oppositeTokenCount).type("1");
        cy.get(ContractsPageLocators.createFinalBtn).click();
    }

    addUserToContract(name) {
        cy.intercept(ContractsPageLocators.tokenPairingStart).as(
            "waitForPairing"
        );
        cy.contains(ContractsPageLocators.contractName, name).parent().
            contains(ContractsPageLocators.operationsBtn).click();
        cy.contains(ContractsPageLocators.addUserBtn).click({force: true});
        let userId;
        cy.readFile('cypress/fixtures/regId.txt').then(file =>{
            userId = file;
        }).then(()=>{
            cy.get(ContractsPageLocators.userIdInput).type(userId);
            cy.contains(ContractsPageLocators.okBtn).click();
            ContractsPage.waitForContracts();
        })
    }

    importContract(importedContract) {
        cy.contains(ContractsPageLocators.importContractBtn).click();
        cy.get(ContractsPageLocators.importedContractIdInput).type("0.0.4537888");
        cy.get(ContractsPageLocators.importedContractDescInput).type(importedContract);
        cy.contains(ContractsPageLocators.okBtn).click();
        ContractsPage.waitForContracts();
        cy.contains(ContractsPageLocators.contractName, importedContract).should(ASSERT.exist);
    }

    verifyButtonsAndHeaders() {
        cy.contains(ContractsPageLocators.createContractBtn).should("exist");
        cy.contains(ContractsPageLocators.importContractBtn).should("exist");
        cy.get(ContractsPageLocators.headerSelector).then(($header) => {
            expect($header.get(0).innerText).to.eq('Hedera Contract Id')
            expect($header.get(1).innerText).to.eq('Description')
            expect($header.get(2).innerText).to.eq('Tags')
            expect($header.get(3).innerText).to.eq('Operations')
            expect($header.get(4).innerText).to.eq('Retirement Requests')
        })
    }

    verifyContractDataAndActions(importedContract) {
        cy.contains(ContractsPageLocators.createTagButton).click();
        cy.get(ContractsPageLocators.tagCreationModal).should('exist');
        cy.get(ContractsPageLocators.createFinalBtn).should('exist');
        cy.get(ContractsPageLocators.tagNameInput).should('exist');
        cy.get(ContractsPageLocators.importedContractDescInput).should('exist');
        cy.get(ContractsPageLocators.closeWindowButton).click();
        cy.contains(ContractsPageLocators.operationsBtn).click();
        cy.contains(ContractsPageLocators.addPairBtn).should("exist");
        cy.contains(ContractsPageLocators.addUserBtn).should("exist");
        cy.get(ContractsPageLocators.contractRowSelector).should(($contract) => {
            const contractElements = $contract.get(0).childNodes;
            expect(contractElements.item(1).innerText).to.eq(importedContract);
            expect(contractElements.item(3).getElementsByClassName("select-menu").item(0).innerText).to.eq("Operations\narrow_drop_down");
            expect(contractElements.item(4).firstChild.firstChild.innerText).to.eq("View");
            expect(contractElements.item(2).getElementsByClassName("tag-name").item(0).innerText).to.eq("Create Tag");
        })
    }

    addTag(tagName) {
        cy.intercept(ContractsPageLocators.tagsListRequest).as(
            "waitForTags"
        );
        cy.contains(ContractsPageLocators.createTagButton).click();
        cy.get(ContractsPageLocators.tagNameInput).type(tagName);
        cy.get(ContractsPageLocators.tagDescInput).type(tagName);
        cy.get(ContractsPageLocators.createFinalBtn).click();
        cy.wait("@waitForTags", { timeout: 30000 })
        cy.contains(tagName).should("exist");
    }

    deleteTag(tagName) {
        cy.intercept(ContractsPageLocators.tagsDeleteRequest).as(
            "waitForTags"
        );
        cy.contains(tagName).click();
        cy.get(ContractsPageLocators.tagDeleteButton).click();
        cy.wait("@waitForTags", { timeout: 30000 })
        cy.get(ContractsPageLocators.closeWindowButton).click();
        cy.contains(tagName).should("not.exist");
    }
}
