import ASSERT from "../../../support/CustomHelpers/assertions";
import TIMEOUTS from "../../../support/CustomHelpers/timeouts";
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
    userIdInput: '[data-placeholder="User Identifier"]'

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

    addUserToContract(name, userId) {
        cy.intercept(ContractsPageLocators.tokenPairingStart).as(
            "waitForPairing"
        );
        cy.log(userId)
        cy.contains(ContractsPageLocators.contractName, name).parent().
            contains(ContractsPageLocators.operationsBtn).click();
        cy.contains(ContractsPageLocators.addUserBtn).click({force: true});
        cy.get(ContractsPageLocators.userIdInput).type(userId);
        cy.contains(ContractsPageLocators.okBtn).click();
        ContractsPage.waitForContracts();
    }
}
