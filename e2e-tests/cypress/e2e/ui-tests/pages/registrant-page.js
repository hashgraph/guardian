import URL from "../../../support/GuardianUrls";

const RegistrantPageLocators = {
    roleSelect: '[formcontrolname="roleOrGroup"]',
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    registrantRole: "Registrant",
    inputGroupLabel: '[formcontrolname="groupLabel"]',
    profileTab: "Profile",
    tokensBtn: "TOKENS",
    createDeviceBtn: "Create New Device",
};

export class RegistrantPage {
    createGroup(role) {
        cy.contains("Policies").click({ force: true });

        cy.get("td").first().parent().get("td").eq("4").click();
        cy.wait(8000);
        cy.get(RegistrantPageLocators.roleSelect)
            .click()
            .get("mat-option")
            .contains(role)
            .click();

        const inputGroup = cy.get(RegistrantPageLocators.inputGroupLabel);
        inputGroup.type("RegistrantGroupTest");

        cy.get(RegistrantPageLocators.submitBtn).click();
        cy.wait(12000);
        cy.get(RegistrantPageLocators.submitBtn).click();
    }

    createDevice() {
        cy.contains("Policies").click({ force: true });

        cy.get("td").first().parent().get("td").eq("4").click();
        cy.wait(8000);
        cy.contains(RegistrantPageLocators.createDeviceBtn).click();
        cy.get(RegistrantPageLocators.submitBtn).click();
        cy.wait(12000);
    }
}
