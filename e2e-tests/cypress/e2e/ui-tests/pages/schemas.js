import ASSERT from "../../../support/CustomHelpers/assertions";
import TIMEOUTS from "../../../support/CustomHelpers/timeouts";
import URL from "../../../support/GuardianUrls";

const SchemasPageLocators = {
    systemSchemasBtn: "System Schemas",
    newBtn: "New",
    nameInput: "*[formcontrolname^='name']",
    createBtn: "Create",
    deleteBtn: "delete",
};

export class SchemasPage {
    openSchemasTab() {
        cy.visit(URL.Root + URL.Schemas);
    }

    createSystemSchema(name) {
        cy.contains(SchemasPageLocators.systemSchemasBtn).click();
        cy.contains(SchemasPageLocators.newBtn).click();

        const inputName = cy.get(SchemasPageLocators.nameInput);
        cy.wait(5000);
        inputName.type(name);
        cy.contains(SchemasPageLocators.createBtn).click();
    }

    deleteSchema(name) {
        cy.contains("td", name).siblings().contains(SchemasPageLocators.deleteBtn).click();

        cy.contains("button", "OK").click();
    }
}
