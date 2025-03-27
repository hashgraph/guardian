import * as Checks from "../../../support/checkingMethods";
import CommonElements from "../../../support/defaultUIElements";

const ContractsPageLocators = {
    createContractBtn: "Create Contract",
    contractNameDescriptionInput: '[placeholder = "Description"]',
    okBtn: "Ok",
    wipingContracts: '[aria-label="Token wiping contracts"]',
    retireContracts: '[aria-label="Token retirement contracts"]',
    createTagButton: ' Create a Tag ',
    tagNameInput: '[ng-reflect-name="name"]',
    tagDescInput: '[ng-reflect-name="description"]',
    createButton: "[ng-reflect-label='Create']",
    deleteTagIcon: "svg-icon[svgclass='accent-color-red']",
    closeWindowButton: "[ng-reflect-label='Close']",
    importContractBtn: "Import Contract",
    importedContractIdInput: '[ng-reflect-name="contractId"]',
    operationsBtn: " Operations ",
    headerSelector: 'th.mat-header-cell',
};

export class ContractsPage {

    openContractsTab() {
        cy.get(CommonElements.navBar).should('exist')
        cy.get("body").then(($body) => {
            if ($body.find(`span:contains(${CommonElements.contractsTab})`).length == 0)
                cy.get(CommonElements.navBar).contains(CommonElements.tokensTab).click();
        })
        cy.get(CommonElements.navBar).contains(CommonElements.contractsTab).click();
        Checks.waitForLoading();
    }

    fillContract(name) {
        cy.get(ContractsPageLocators.contractNameDescriptionInput).type(name);
        cy.contains(ContractsPageLocators.okBtn).click();
        Checks.waitForLoading();
        cy.contains(ContractsPageLocators.contractName, name).should("exist");
    }

    createContract() {
        cy.contains(ContractsPageLocators.createContractBtn).click();
    }

    openContractTypeTab(type) {
        if (type == "wipe")
            cy.get(ContractsPageLocators.wipingContracts).then(($tab) => {
                if (!$tab.hasClass("p-highlight"))
                    cy.wrap($tab).click();
            });
        if (type == "retire")
            cy.get(ContractsPageLocators.retireContracts).then(($tab) => {
                if (!$tab.hasClass("p-highlight"))
                    cy.wrap($tab).click();
            });
        Checks.waitForLoading();
    }

    addTag(name, tagName) {
        cy.contains(name).siblings().contains(ContractsPageLocators.createTagButton).click();
        cy.get(ContractsPageLocators.tagNameInput).type(tagName);
        cy.get(ContractsPageLocators.tagDescInput).type(tagName);
        cy.get(ContractsPageLocators.createButton).click();
        cy.contains(tagName).should("exist");
    }

    deleteTag(name, tagName) {
        cy.contains(name).siblings().contains(tagName).click();
        cy.get(ContractsPageLocators.deleteTagIcon).click();
        cy.get(ContractsPageLocators.closeWindowButton).click();
        cy.contains(tagName).should("not.exist");
    }

    importContract(id) {
        cy.contains(ContractsPageLocators.importContractBtn).click();
        cy.get(ContractsPageLocators.importedContractIdInput).type(id);
    }

    verifyButtonsAndHeaders() {
        cy.contains(ContractsPageLocators.createContractBtn).should("exist");
        cy.contains(ContractsPageLocators.importContractBtn).should("exist");
        cy.get(ContractsPageLocators.headerSelector).then(($header) => {
            expect($header.get(0).innerText).to.eq('Hedera Contract Id')
            expect($header.get(1).innerText).to.eq('Description')
            expect($header.get(2).innerText).to.eq('Tags')
            expect($header.get(3).innerText).to.eq('Permissions')
            expect($header.get(4).innerText).to.eq('Operations')
        })
    }

    verifyContractDataAndActions(name) {
        cy.contains(name).parent().should(($contract) => {
            const contractElements = $contract.get(0).childNodes;
            expect(contractElements.item(0).getElementsByTagName('hedera-explorer')).to.exist;
            expect(contractElements.item(0).getElementsByTagName('a')).to.exist;
            expect(contractElements.item(1).innerText).to.eq(name);
            expect(contractElements.item(2).getElementsByTagName('tags-explorer')).to.exist;
            expect(contractElements.item(3).getElementsByClassName("permissions")).to.exist;
            expect(contractElements.item(4).getElementsByTagName('select-menu-button')).to.exist;
        })
    }
}
