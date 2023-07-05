import URL from "../../../support/GuardianUrls";

const SettingsPageLocators = {
};

export class SettingsPage {

    openSettingsTab() {
        cy.visit(URL.Root + URL.Settings);
    }

    verifyIfFieldHasValidation(field, text) {
        cy.get(`input[name='${field}']`)
        .clear()
        .type(text)
        .trigger('blur');
        cy.get(`input[name='${field}']`).should("have.class", "ng-invalid");
    }

}