import URL from "../../../support/GuardianUrls";

const d = new Date(2022, 3, 3);

const RegistrantPageLocators = {
    roleSelect: '[formcontrolname="roleOrGroup"]',
    policiesList: "/api/v1/policies?pageIndex=0&pageSize=10",
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    applicationRegBtns: 'div.page-btns',
    createBtn: 'Create',
    appRegistrantDetails: "/api/v1/profiles/Registranttt",
    tokensWaiter: "/api/v1/tokens",
    registrantRole: "Registrant",
    inputGroupLabel: '[formcontrolname="groupLabel"]',
    profileTab: "Profile",
    tokensBtn: "TOKENS",
    createDeviceBtn: " Create New Device ",
    createIsssueRequestBtn: "Create Issue Request",
    enterTextInput: '[placeholder="Please enter text here"]',
    enterNumInput: '[placeholder="123"]',
    requiredFillDateLabel: "Please make sure the field contain a valid date value",
    requiredFillNumberLabel: "Please make sure the field contain a valid number value",
    hederaId: "HEDERA ID",
    profileValue: "div.account-item-value",
    profilePage: '/api/v1/schemas/system/entity/USER',
    balance: '/api/v1/profiles/Registrant/balance',
    approvalLabel: 'app-information-block',
    tokenId: 'hedera-explorer > a',
    tokenIdByHistory: 'td.cdk-column-1',
};


export class RegistrantPage {

    openUserProfile() {
        cy.visit(URL.Root + URL.Profile);
    }


    openTokensTab() {
        cy.visit(URL.Root + URL.UserTokens);
    }

    createGroup(role) {
        cy.contains("Policies").click({force: true});
        cy.contains("List of Policies").click({force: true});
        cy.wait(1000)
        cy.get("td").first().parent().get("td").eq("6").contains("Open").click();
        cy.wait(1000)
        cy.get(RegistrantPageLocators.roleSelect).click().get("p-dropdownitem").contains(role).click();
        cy.get(RegistrantPageLocators.submitBtn).click({force: true});
        cy.intercept("/api/v1/profiles/" + role).as("waitForRegister" + role);
        cy.wait("@waitForRegister" + role, { timeout: 180000 });
        cy.get(RegistrantPageLocators.applicationRegBtns).contains("Next").click();
        cy.get(RegistrantPageLocators.applicationRegBtns).contains("Next").click();
        cy.get(RegistrantPageLocators.applicationRegBtns).contains("Create").click();
        cy.wait(90000);
        cy.contains("Submitted for Approval").should("exist");
    }


    static waitForPolicyList() {
        cy.intercept(RegistrantPageLocators.policiesList).as(
            "waitForPoliciesList"
        );
        cy.wait("@waitForPoliciesList", {timeout: 100000})
    }


    static waitForBalance() {
        cy.intercept(RegistrantPageLocators.balance).as(
            "waitForBalance"
        );
        cy.wait(['@waitForBalance', '@waitForBalance'], {timeout: 100000})
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
        cy.contains("List of Policies").click({force: true});
        RegistrantPage.waitForPolicyList();
        cy.get("td").first().parent().get("td").eq("6").contains("Open").click();
        cy.contains("Devices").click({force: true});
        cy.intercept("/api/v1/profiles/Registrant").as("waitForRegisterRegistrant");
        cy.wait("@waitForRegisterRegistrant", { timeout: 180000 });
        cy.contains(RegistrantPageLocators.createDeviceBtn).click();
        cy.get(RegistrantPageLocators.submitBtn).last().click();
        cy.wait(60000);
        cy.contains("Waiting for approval").should("exist");
    }


    createIssueRequest() {
        RegistrantPage.waitForRegistrant();
        cy.contains("Policies").click({force: true});
        cy.contains("List of Policies").click({force: true});
        cy.get("td").first().parent().get("td").eq("6").contains("Open").click();
        cy.contains("Devices").click({force: true});
        cy.intercept("/api/v1/profiles/Registrant").as("waitForRegisterRegistrant");
        cy.wait("@waitForRegisterRegistrant", { timeout: 180000 });
        cy.contains(RegistrantPageLocators.createIsssueRequestBtn).click();
        cy.contains(RegistrantPageLocators.requiredFillDateLabel).parent().parent().parent().find('input').type('3/1/2023')
        cy.contains(RegistrantPageLocators.requiredFillDateLabel).parent().parent().parent().find('input').type('3/1/2023')
        cy.contains(RegistrantPageLocators.requiredFillNumberLabel).parent().parent().parent().find('input').type('123')
        cy.get(RegistrantPageLocators.submitBtn).last().click();
        cy.wait(60000);
        cy.contains("Issue Requests").click({force: true});
        cy.contains("Waiting for approval").should("exist");
    }

    getId() {
        RegistrantPage.waitForBalance();
        cy.contains(RegistrantPageLocators.hederaId).parent().find(RegistrantPageLocators.profileValue).find("a")
            .then(($div) => {
                cy.writeFile('cypress/fixtures/regId.txt', $div.get(0).innerText);
            });
    }

    checkTokenBalance() {
        cy.intercept(RegistrantPageLocators.tokensWaiter).as(
            "waitForTokens"
        );
        cy.wait("@waitForTokens", {timeout: 60000})
        cy.get("td").last().parent().find("td").eq("2").should('have.text', " 123 ");
        let tokenId;
        cy.readFile('cypress/fixtures/tokenId.txt').then(file => {
            tokenId = file;
        }).then(() => {
            cy.contains(tokenId.trim()).should("exist");
        })
    }

    checkTokenHistory() {
        cy.contains("Policies").click({force: true});
        cy.wait(2000);
        cy.get("td").first().parent().get("td").eq("5").click();
        cy.contains("Token History").click({force: true});
        cy.get(RegistrantPageLocators.tokenIdByHistory)
            .then(($a) => {
                cy.writeFile('cypress/fixtures/tokenId.txt', $a.find('.text').text());
            });
    }
}
