import URL from "../../../support/GuardianUrls";

const d = new Date(2022, 3, 3);
const PPPageLocators = {
    roleSelect: '[formcontrolname="roleOrGroup"]',
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    registrantRole: "Registrant",
    inputGroupLabel: '[formcontrolname="groupLabel"]',
    profileTab: "Profile",
    tokensBtn: "TOKENS",
    createProjectBtn: "New project",
    newProjectForm: '[class="form-dialog"]',
    enterTextInput: '[placeholder="Please enter text here"]',
    enterNumInput: '[placeholder="123"]',
    validateDD: "*[class^='content-dropdown ng-star-inserted']",
};

export class PPPage {
    createGroup(role) {
        cy.reload();
        cy.contains("Policies").click({ force: true });

        cy.get("td").first().parent().get("td").eq("4").click();
        cy.wait(8000);
        cy.get(PPPageLocators.roleSelect)
            .click()
            .get("mat-option")
            .contains(role)
            .click();

        // const inputGroup = cy.get(PPPageLocators.inputGroupLabel);
        // inputGroup.type("PPGroupTest");

        cy.get(PPPageLocators.submitBtn).click();
        cy.wait(12000);
    }

    createProject() {
        cy.contains(PPPageLocators.createProjectBtn).click();

        cy.get(PPPageLocators.enterTextInput).then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type("Test text", { force: true })
            );
        });
        cy.get(PPPageLocators.enterNumInput).then((els) => {
            [...els].forEach((el) => cy.wrap(el).type("123", { force: true }));
        });
        cy.get('input[aria-haspopup="dialog"]').then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type(d.toLocaleDateString("en-GB"))
            );
        });

        cy.fixture("map.png").as("myFixture");
        cy.get("input[type=file]").selectFile("@myFixture", {
            force: true,
        });

        cy.wait(12000);
        cy.get(PPPageLocators.submitBtn).click();
        cy.wait(12000);
    }

    assignPolicy() {
        cy.contains("Policies").click({ force: true });

        cy.get("td").first().parent().get("td").eq("4").click();
        cy.wait(8000);
        cy.get(PPPageLocators.validateDD)
            .click()
            .get("mat-option")
            .contains("VVBTestName")
            .click();
        cy.wait(12000);
    }
}
