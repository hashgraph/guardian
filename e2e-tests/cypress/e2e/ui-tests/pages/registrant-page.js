import URL from "../../../support/GuardianUrls";

const d = new Date(2022, 3, 3);

const RegistrantPageLocators = {
    roleSelect: '[formcontrolname="roleOrGroup"]',
    policiesList: "/api/v1/policies?pageIndex=0&pageSize=100",
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    appRegistrantDetails: "/api/v1/profiles/Registrant",
    registrantRole: "Registrant",
    inputGroupLabel: '[formcontrolname="groupLabel"]',
    profileTab: "Profile",
    tokensBtn: "TOKENS",
    createDeviceBtn: "Create New Device",
    createIsssueRequestBtn: "Create Issue Request",
    enterTextInput: '[placeholder="Please enter text here"]',
    enterNumInput: '[placeholder="123"]',
    requiredFillDateLabel: "Please make sure the field contain a valid date value",
    requiredFillNumberLabel: "Please make sure the field contain a valid number value",
    hederaId: "HEDERA ID:",
    profileValue: "div.profile-item-value",
    profilePage: '/api/v1/schemas/system/entity/USER',
    approvalLabel: 'app-information-block',
};


export class RegistrantPage {

    openUserProfile() {
        cy.visit(URL.Root + URL.Profile);
    }

    createGroup(role) {
        cy.contains("Policies").click({force: true});
        RegistrantPage.waitForPolicyList();
        cy.get("td").first().parent().get("td").eq("5").click();
        cy.wait(1000)
        cy.get(RegistrantPageLocators.roleSelect).click().get("mat-option").contains(role).click();
        cy.get(RegistrantPageLocators.submitBtn).click({force: true});
        cy.intercept(RegistrantPageLocators.appRegistrantDetails).as(
            "waitForAppDetails"
        );
        cy.wait("@waitForAppDetails", {timeout: 200000})
        cy.get(RegistrantPageLocators.submitBtn).click();
        cy.wait(20000);
        cy.contains("Submitted for Approval").should("exist");
    }


    static waitForPolicyList() {
        cy.intercept(RegistrantPageLocators.policiesList).as(
            "waitForPoliciesList"
        );
        cy.wait("@waitForPoliciesList", {timeout: 100000})
    }


    static waitForRegistrant() {
        cy.intercept(RegistrantPageLocators.profilePage).as(
            "waitForRegistrant"
        );
        cy.wait("@waitForRegistrant", {timeout: 100000})
    }

    chooseRole(role) {
        cy.contains("Policies").click({force: true});
        cy.get("td").first().parent().get("td").eq("4").click();
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
        RegistrantPage.waitForRegistrant();
        cy.contains("Policies").click({force: true});
        RegistrantPage.waitForPolicyList();
        cy.get("td").first().parent().get("td").eq("5").click();
        cy.contains("Devices").click({force: true});
        cy.intercept(RegistrantPageLocators.appRegistrantDetails).as(
            "waitForAppDetails"
        );
        cy.wait("@waitForAppDetails", {timeout: 200000})
        cy.contains(RegistrantPageLocators.createDeviceBtn).click();
        cy.get(RegistrantPageLocators.submitBtn).click();
        cy.wait(20000);
        cy.contains("Waiting for approval").should("exist");
    }


    createIssueRequest() {
        RegistrantPage.waitForRegistrant();
        cy.contains("Policies").click({force: true});
        cy.get("td").first().parent().get("td").eq("5").click();
        cy.contains("Devices").click({force: true});
        cy.intercept(RegistrantPageLocators.appRegistrantDetails).as(
            "waitForAppDetails"
        );
        cy.wait("@waitForAppDetails", {timeout: 200000})
        cy.contains(RegistrantPageLocators.createIsssueRequestBtn).click();
        cy.contains(RegistrantPageLocators.requiredFillDateLabel).parent().parent().parent().find('input').type('3/1/2023')
        cy.contains(RegistrantPageLocators.requiredFillDateLabel).parent().parent().parent().find('input').type('3/1/2023')
        cy.contains(RegistrantPageLocators.requiredFillNumberLabel).parent().parent().parent().find('input').type('123')
        cy.get(RegistrantPageLocators.submitBtn).click();
        cy.wait(20000);
        cy.contains("Issue Requests").click({ force: true });
        cy.contains("Waiting for approval").should("exist");
    }

    getId() {
        RegistrantPage.waitForRegistrant();
        cy.contains(RegistrantPageLocators.hederaId).parent().find(RegistrantPageLocators.profileValue).find("a")
            .then(($div) => {
                cy.writeFile('cypress/fixtures/regId.txt', $div.get(0).innerText);
            });
    }
}
