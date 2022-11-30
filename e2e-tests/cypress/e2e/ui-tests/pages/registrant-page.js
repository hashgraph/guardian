import URL from "../../../support/GuardianUrls";

const d = new Date(2022, 3, 3);

const RegistrantPageLocators = {
    roleSelect: '[formcontrolname="roleOrGroup"]',
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    registrantRole: "Registrant",
    inputGroupLabel: '[formcontrolname="groupLabel"]',
    profileTab: "Profile",
    tokensBtn: "TOKENS",
    createDeviceBtn: "Create New Device",
    createIsssueRequestBtn: "Create Issue Request",
    enterTextInput: '[placeholder="Please enter text here"]',
    enterNumInput: '[placeholder="123"]',
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

    chooseRole(role) {
        cy.contains("Policies").click({ force: true });

        cy.get("td").first().parent().get("td").eq("4").click();
        cy.wait(8000);
        cy.get(RegistrantPageLocators.roleSelect)
            .click()
            .get("mat-option")
            .contains(role)
            .click();

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


    createIssueRequest() {
        cy.contains("Policies").click({ force: true });
        cy.get("td").first().parent().get("td").eq("4").click();
        cy.wait(8000);
        cy.contains(RegistrantPageLocators.createIsssueRequestBtn).click();

        cy.get(RegistrantPageLocators.enterTextInput).then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type("Test text", { force: true })
            );
        });
        cy.get(RegistrantPageLocators.enterNumInput).then((els) => {
            [...els].forEach((el) => cy.wrap(el).type("123", { force: true }));
        });
        cy.get('input[aria-haspopup="dialog"]').then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type(d.toLocaleDateString("en-GB"))
            );
        });

        cy.get(RegistrantPageLocators.submitBtn).click();
        cy.wait(12000);
    }
}
