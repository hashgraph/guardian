import URL from "../../../support/GuardianUrls";

const VerraPageLocators = {
    roleSelect: '[formcontrolname="roleOrGroup"]',
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    registrantRole: "Registrant",
    inputGroupLabel: '[formcontrolname="groupLabel"]',
    inputInvitation: '[formcontrolname="invitation"]',
    profileTab: "Profile",
    tokensBtn: "TOKENS",
    createDeviceBtn: "Create New Device",
    vvbNameInput: '[placeholder="Please enter text here"]',
};

export class VerraPage {
    createGroup(role) {
        cy.contains("Policies").click({ force: true });

        cy.get("td").first().parent().get("td").eq("4").click();
        cy.wait(8000);
        cy.get(VerraPageLocators.roleSelect)
            .click()
            .get("mat-option")
            .contains(role)
            .click();

        // const inputGroup = cy.get(VerraPageLocators.inputGroupLabel);
        // inputGroup.type("VVB Group Test");

        cy.get(VerraPageLocators.submitBtn).click();
        cy.wait(12000);
        const inputName = cy.get(VerraPageLocators.vvbNameInput);
        inputName.type("VVBTestName");
        cy.get(VerraPageLocators.submitBtn).click();
    }

    getInvite() {
        cy.contains("Policies").click({ force: true });
        cy.get("td").first().parent().get("td").eq("4").click();
        cy.wait(8000);
        cy.contains("Members").click({ force: true });
        cy.contains("*[class^='mat-button-wrapper']", "Get Invite").click();
        cy.contains("Generate invite").click({ force: true });
    }

    copyInvitation() {
        cy.contains("*[class^='link-btn']", "Copy invitation").click();
        cy.contains("*[role^='img']", "close").click();
        cy.wait(8000);
    }

    createGroupWithInvitation() {
        cy.contains("Policies").click({ force: true });

        cy.get("td").first().parent().get("td").eq("4").click();
        cy.wait(8000);

        cy.contains("*[value^='invite']", " Accept invitation ").click();

        cy.window()
            .its("navigator.clipboard")
            .invoke("readText")
            .then((text) => {
                cy.get(VerraPageLocators.inputInvitation)
                    .click()
                    .invoke("val", text);
            });
        cy.wait(8000);
        // cy.get(VerraPageLocators.submitBtn).click();
        // cy.wait(12000);
    }

    signPolicy() {
        cy.contains("*[class^='link-btn']", "Sign").click();
    }
}
