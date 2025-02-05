import URL from "../../../support/GuardianUrls";
import CommonElements from "../../../support/defaultUIElements";

const SettingsPageLocators = {
    operatorId: "input[id='operatorId']",
    opKey: "input[id='opKey']",
    ipfsKey: "input[id='ipfsKey']",
    ipfsProof: "input[id='ipfsProof']",
    saveChangeButton: "Save Changes",
};

export class SettingsPage {

    openSettingsTab() {
        cy.get(CommonElements.navBar).contains(CommonElements.administrationTab).click()
        cy.get(CommonElements.navBar).contains(CommonElements.settingsTab).click()
    }

    verifyIfFieldHasValidation() {
        cy.get(SettingsPageLocators.operatorId).clear().type("1");
        cy.get(SettingsPageLocators.opKey).type("2");
        cy.get(SettingsPageLocators.ipfsKey).type("3");
        cy.get(SettingsPageLocators.ipfsProof).type("4");
        cy.contains(SettingsPageLocators.saveChangeButton).should('be.disabled')
    }

}
