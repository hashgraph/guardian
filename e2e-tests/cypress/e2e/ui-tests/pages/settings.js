import URL from '../../../support/GuardianUrls';
import { waitForPageReady } from '../../../support/pageReadiness';

const SettingsPageLocators = {
    settingsProp: (prop) => `input[id=${prop}]`,
    saveChangeButton: 'Save Changes',
};

export class SettingsPage {

    openSettingsTab() {
        cy.visit(URL.Root + URL.Settings);
        waitForPageReady(SettingsPageLocators.settingsProp('operatorId'));
    }

    verifyIfFieldHasValidation() {
        cy.get(SettingsPageLocators.settingsProp('operatorId')).clear();
        cy.get(SettingsPageLocators.settingsProp('operatorId')).type('1');
        cy.get(SettingsPageLocators.settingsProp('opKey')).type('2');
        cy.get(SettingsPageLocators.settingsProp('ipfsKey')).type('3');
        cy.contains(SettingsPageLocators.saveChangeButton).should('be.disabled');
    }

}
