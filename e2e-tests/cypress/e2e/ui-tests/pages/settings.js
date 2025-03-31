import CommonElements from "../../../support/defaultUIElements";

const SettingsPageLocators = {
    settingsProp: (prop) => `input[id=${prop}]`,
    saveChangeButton: "Save Changes",
};

export class SettingsPage {

    openSettingsTab() {
        cy.get(CommonElements.navBar).contains(CommonElements.administrationTab).click();
        cy.get(CommonElements.navBar).contains(CommonElements.settingsTab).click();
    }

    verifyIfFieldHasValidation() {
        cy.get(SettingsPageLocators.settingsProp("operatorId")).clear().type("1");
        cy.get(SettingsPageLocators.settingsProp("opKey")).type("2");
        cy.get(SettingsPageLocators.settingsProp("ipfsKey")).type("3");
        cy.get(SettingsPageLocators.settingsProp("ipfsProof")).type("4");
        cy.contains(SettingsPageLocators.saveChangeButton).should('be.disabled');
    }

}
